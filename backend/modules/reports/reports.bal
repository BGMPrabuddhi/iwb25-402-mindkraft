import ballerina/http;
import ballerina/log;
import ballerina/mime;
import ballerina/file;
import ballerina/io;
import ballerina/uuid;
import ballerina/task;
import saferoute/backend.types;
import saferoute/backend.database;

// Configuration
configurable string uploadDir = "uploads";

// Constants
const string[] ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const int MAX_FILE_SIZE = 10485760; // 10MB

// Global cleanup task reference
task:JobId? cleanupTaskId = ();

// ==================== INITIALIZATION ====================

public function initializeUploadDirectory() returns error? {
    boolean|file:Error dirExists = file:test(uploadDir, file:EXISTS);
    if dirExists is file:Error || !dirExists {
        check file:createDir(uploadDir);
        log:printInfo("Created upload directory: " + uploadDir);
    }
}

public function initializeCleanupTask() returns error? {
    task:JobId? taskId = check task:scheduleJobRecurByFrequency(new CleanupJob(), 3600000);
    cleanupTaskId = taskId;
    log:printInfo("Initialized automatic report cleanup task - runs every hour");
}

public function stopCleanupTask() returns error? {
    if cleanupTaskId is task:JobId {
        check task:unscheduleJob(<task:JobId>cleanupTaskId);
        log:printInfo("Stopped automatic report cleanup task");
    }
}

public function getUploadDir() returns string {
    return uploadDir;
}

// ==================== CLEANUP JOB ====================

class CleanupJob {
    *task:Job;
    
    public function execute() {
        do {
            int deletedCount = check database:deleteOldReports();
            if deletedCount > 0 {
                log:printInfo("Cleanup task completed: deleted " + deletedCount.toString() + " old reports");
            }
        } on fail error e {
            log:printError("Cleanup task failed: " + e.message());
        }
    }
}

// ==================== FILE HANDLING ====================

public function saveImageFile(mime:Entity part) returns string|error {
    mime:ContentDisposition contentDisposition = part.getContentDisposition();
    string fileName = contentDisposition.fileName;
    
    if fileName.trim() == "" {
        return error("No filename provided");
    }
    
    // Validate file extension
    string fileExtension = getFileExtension(fileName);
    if !isValidImageExtension(fileExtension) {
        return error("Invalid file type. Allowed types: " + string:'join(", ", ...ALLOWED_IMAGE_EXTENSIONS));
    }
    
    // Generate unique filename
    string uniqueFileName = uuid:createType4AsString() + fileExtension;
    string filePath = uploadDir + "/" + uniqueFileName;
    
    // Read and save file
    byte[]|mime:ParserError bytesResult = part.getByteArray();
    if bytesResult is byte[] {
        // Validate file size
        if bytesResult.length() > MAX_FILE_SIZE {
            return error("File size exceeds maximum limit of 10MB");
        }
        
        check io:fileWriteBytes(filePath, bytesResult);
        log:printInfo("Image uploaded: " + fileName + " -> " + uniqueFileName);
        return uniqueFileName;
    } else {
        return error("Failed to read image bytes");
    }
}

public function getImageContentType(string filename) returns string {
    string extension = getFileExtension(filename).toLowerAscii();
    match extension {
        ".jpg"|".jpeg" => {
            return "image/jpeg";
        }
        ".png" => {
            return "image/png";
        }
        ".gif" => {
            return "image/gif";
        }
        ".webp" => {
            return "image/webp";
        }
        _ => {
            return "application/octet-stream";
        }
    }
}

// ==================== REPORT HANDLERS ====================

public function handleReportSubmission(http:Caller caller, http:Request req) returns error? {
    http:Response res = createCorsResponse();
    string contentType = req.getContentType();
    log:printInfo("Content-Type: " + contentType);

    if contentType.includes("multipart/form-data") {
        check handleMultipartSubmission(caller, req, res);
    } else {
        check handleJsonSubmission(caller, req, res);
    }
}

public function handleGetReports(http:Caller caller, http:Request req) returns error? {
    http:Response res = createCorsResponse();

    types:HazardReport[]|error reportsResult = database:getAllReports();
    
    if reportsResult is types:HazardReport[] {
        types:ReportsResponse response = {
            status: "success",
            message: "Reports retrieved successfully",
            reports: reportsResult
        };
        res.setPayload(response);
    } else {
        log:printError("Failed to retrieve reports: " + reportsResult.message());
        res.setPayload(createErrorResponse("Failed to retrieve reports: " + reportsResult.message()));
    }
    
    check caller->respond(res);
}

public function handleUpdateReport(http:Caller caller, http:Request req, int reportId) returns error? {
    http:Response res = createCorsResponse();

    json|error body = req.getJsonPayload();
    if body is error {
        res.setPayload(createErrorResponse("Invalid JSON payload"));
        check caller->respond(res);
        return;
    }
    
    types:UpdateReportPayload|error updateData = body.cloneWithType(types:UpdateReportPayload);
    if updateData is error {
        res.setPayload(createErrorResponse("Invalid update data"));
        check caller->respond(res);
        return;
    }
    
    // Validate required fields
    ValidationResult validation = validateUpdateReportData(updateData);
    if !validation.isValid {
        res.setPayload(createErrorResponse(validation.errorMessage));
        check caller->respond(res);
        return;
    }
    
    string title = updateData.title ?: "";
    string description = updateData.description ?: "";
    string hazardType = updateData.hazard_type ?: "";
    string severityLevel = updateData.severity_level ?: "";
    
    types:HazardReport|error result = database:updateHazardReport(reportId, title, description, hazardType, severityLevel);
    
    if result is types:HazardReport {
        types:UpdateReportResponse response = {
            status: "success",
            message: "Report updated successfully",
            data: result
        };
        res.setPayload(response);
    } else {
        log:printError("Failed to update report: " + result.message());
        res.setPayload(createErrorResponse("Failed to update report: " + result.message()));
    }
    
    check caller->respond(res);
}

public function handleDeleteReport(http:Caller caller, http:Request req, int reportId) returns error? {
    http:Response res = createCorsResponse();
    
    boolean|error result = database:deleteHazardReport(reportId);
    
    if result is boolean && result {
        types:DeleteReportResponse response = {
            status: "success",
            message: "Report deleted successfully"
        };
        res.setPayload(response);
    } else {
        string errorMsg = result is error ? result.message() : "Failed to delete report";
        log:printError("Failed to delete report: " + errorMsg);
        res.setPayload(createErrorResponse("Failed to delete report: " + errorMsg));
    }
    
    check caller->respond(res);
}

// ==================== PRIVATE HANDLER FUNCTIONS ====================

function handleMultipartSubmission(http:Caller caller, http:Request req, http:Response res) returns error? {
    mime:Entity[]|http:ClientError bodyPartsResult = req.getBodyParts();
    
    if bodyPartsResult is mime:Entity[] {
        MultipartData data = extractMultipartData(bodyPartsResult);
        
        // Validate required fields
        ValidationResult validation = validateReportData(data);
        if !validation.isValid {
            res.setPayload(createErrorResponse(validation.errorMessage));
            check caller->respond(res);
            return;
        }
        
        // Convert location data
        LocationData location = parseLocationData(data.latitude, data.longitude, data.address);
        
        // Insert into database
        int|error result = database:insertHazardReport(
            data.title, 
            data.description, 
            data.hazardType, 
            data.severityLevel, 
            data.imageNames, 
            location.latitude, 
            location.longitude, 
            location.address
        );
        
        if result is int {
            string[] imageUrls = data.imageNames.map(name => "http://localhost:8080/api/images/" + name);
            
            log:printInfo("Report created successfully with ID: " + result.toString());
            log:printInfo("Summary: " + data.imageNames.length().toString() + " images, Location: " + data.address);
            
            types:ApiResponse response = {
                status: "success",
                message: "Report submitted successfully with " + data.imageNames.length().toString() + " images",
                report_id: result,
                images_uploaded: data.imageNames.length(),
                image_urls: imageUrls
            };
            res.setPayload(response);
        } else {
            log:printError("Database error: " + result.toString());
            res.setPayload(createErrorResponse("Database error: " + result.toString()));
        }
    } else {
        res.setPayload(createErrorResponse("Invalid multipart payload"));
    }
    
    check caller->respond(res);
}

function handleJsonSubmission(http:Caller caller, http:Request req, http:Response res) returns error? {
    json|error body = req.getJsonPayload();
    if body is error {
        res.setPayload(createErrorResponse("Invalid JSON payload"));
        check caller->respond(res);
        return;
    }
    
    types:HazardReportPayload|error report = body.cloneWithType(types:HazardReportPayload);
    if report is error {
        res.setPayload(createErrorResponse("Invalid report data"));
        check caller->respond(res);
        return;
    }
    
    string[] emptyImages = [];
    string description = report["description"] is string ? report["description"] : "";
    
    int|error result = database:insertHazardReport(
        report.title,
        description,
        report.hazard_type,
        report.severity_level,
        emptyImages,
        (),
        (),
        ()
    );
    
    if result is int {
        types:ApiResponse response = {
            status: "success",
            message: "Report submitted successfully",
            report_id: result,
            images_uploaded: 0,
            image_urls: []
        };
        res.setPayload(response);
    } else {
        res.setPayload(createErrorResponse(result.toString()));
    }
    
    check caller->respond(res);
}

// ==================== HELPER FUNCTIONS ====================

type MultipartData record {
    string title;
    string description;
    string hazardType;
    string severityLevel;
    string latitude;
    string longitude;
    string address;
    string[] imageNames;
};

type LocationData record {
    decimal? latitude;
    decimal? longitude;
    string? address;
};

type ValidationResult record {
    boolean isValid;
    string errorMessage;
};

function extractMultipartData(mime:Entity[] bodyParts) returns MultipartData {
    MultipartData data = {
        title: "",
        description: "",
        hazardType: "",
        severityLevel: "",
        latitude: "",
        longitude: "",
        address: "",
        imageNames: []
    };
    
    foreach mime:Entity part in bodyParts {
        mime:ContentDisposition contentDisposition = part.getContentDisposition();
        string partName = contentDisposition.name;
        
        match partName {
            "images" => {
                string|error savedFileName = saveImageFile(part);
                if savedFileName is string {
                    data.imageNames.push(savedFileName);
                    log:printInfo("Image saved: " + savedFileName);
                } else {
                    log:printError("Image save failed: " + savedFileName.message());
                }
            }
            "title" => {
                data.title = getTextFromPart(part);
            }
            "hazard_type" => {
                data.hazardType = getTextFromPart(part);
            }
            "severity_level" => {
                data.severityLevel = getTextFromPart(part);
            }
            "description" => {
                data.description = getTextFromPart(part);
            }
            "latitude" => {
                data.latitude = getTextFromPart(part);
            }
            "longitude" => {
                data.longitude = getTextFromPart(part);
            }
            "address" => {
                data.address = getTextFromPart(part);
            }
        }
    }
    
    return data;
}

function getTextFromPart(mime:Entity part) returns string {
    string|mime:ParserError textResult = part.getText();
    return textResult is string ? textResult : "";
}

function parseLocationData(string latitude, string longitude, string address) returns LocationData {
    decimal? latDecimal = ();
    decimal? lngDecimal = ();
    
    if latitude != "" {
        decimal|error latResult = decimal:fromString(latitude);
        if latResult is decimal {
            latDecimal = latResult;
        }
    }
    
    if longitude != "" {
        decimal|error lngResult = decimal:fromString(longitude);
        if lngResult is decimal {
            lngDecimal = lngResult;
        }
    }
    
    return {
        latitude: latDecimal,
        longitude: lngDecimal,
        address: address != "" ? address : ()
    };
}

function validateReportData(MultipartData data) returns ValidationResult {
    if data.title == "" || data.hazardType == "" || data.severityLevel == "" {
        return {
            isValid: false,
            errorMessage: "Missing required fields: title, hazard_type, severity_level"
        };
    }
    
    return {isValid: true, errorMessage: ""};
}

function validateUpdateReportData(types:UpdateReportPayload updateData) returns ValidationResult {
    if updateData.title is () || updateData.hazard_type is () || updateData.severity_level is () {
        return {
            isValid: false,
            errorMessage: "Missing required fields: title, hazard_type, severity_level"
        };
    }
    
    return {isValid: true, errorMessage: ""};
}

function getFileExtension(string filename) returns string {
    int? lastDotIndex = filename.lastIndexOf(".");
    if lastDotIndex is int && lastDotIndex > 0 {
        return filename.substring(lastDotIndex);
    }
    return ".jpg"; // Default extension
}

function isValidImageExtension(string extension) returns boolean {
    return ALLOWED_IMAGE_EXTENSIONS.some(ext => ext.toLowerAscii() == extension.toLowerAscii());
}

function createCorsResponse() returns http:Response {
    http:Response res = new;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res;
}

function createErrorResponse(string message) returns json {
    return {
        "status": "error", 
        "message": message
    };
}