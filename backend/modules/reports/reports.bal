import ballerina/http;
import ballerina/log;
import ballerina/mime;
import ballerina/file;
import ballerina/io;
import ballerina/uuid;
import ballerina/task;
import ballerina/time; 
import saferoute/backend.types;
import saferoute/backend.database;
import saferoute/backend.auth;

configurable string uploadDir = "uploads";

const string[] ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
const int MAX_FILE_SIZE = 10485760; // 10MB

task:JobId? cleanupTaskId = ();

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

public function saveImageFile(mime:Entity part) returns string|error {
    mime:ContentDisposition contentDisposition = part.getContentDisposition();
    // Fix: ContentDisposition.fileName is not optional, remove ?:
    string fileName = contentDisposition.fileName;
    
    if fileName.trim() == "" {
        return error("No filename provided");
    }
    
    string fileExtension = getFileExtension(fileName);
    if !isValidImageExtension(fileExtension) {
        return error("Invalid file type. Allowed types: " + string:'join(", ", ...ALLOWED_IMAGE_EXTENSIONS));
    }
    
    string uniqueFileName = uuid:createType4AsString() + fileExtension;
    string filePath = uploadDir + "/" + uniqueFileName;
    
    byte[]|mime:ParserError bytesResult = part.getByteArray();
    if bytesResult is byte[] {
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

    var reportsResult = database:getAllReports();
    if reportsResult is error {
        log:printError("Failed to retrieve reports: " + reportsResult.message());
        res.setPayload(createErrorResponse("Failed to retrieve reports: " + reportsResult.message()));
    } else {
        types:HazardReport[] typedReports = [];
        foreach var r in reportsResult {
            types:Location? location = ();
            if r.location is record {| decimal lat; decimal lng; string? address; |} {
                record {| decimal lat; decimal lng; string? address; |} loc = <record {| decimal lat; decimal lng; string? address; |}>r.location;
                location = {
                    lat: loc.lat,
                    lng: loc.lng,
                    address: loc.address
                };
            }

            // Fetch submitting user details
            map<json>? submittedBy = ();
            if r.user_id is int {
                var userResult = database:getUserById(r.user_id);
                string userResultStr = userResult is database:User ? userResult.toString() : (userResult is error ? userResult.message() : "unknown");
                log:printInfo("DEBUG: getUserById(" + r.user_id.toString() + ") result: " + userResultStr);
                if userResult is database:User {
                    submittedBy = {
                        id: userResult.id,
                        firstName: userResult.first_name,
                        lastName: userResult.last_name,
                        contactNumber: userResult.contact_number ?: "",
                        email: userResult.email,
                        profileImage: userResult.profile_image ?: "",
                        location: userResult.address
                    };
                } else {
                    log:printError("Hazard report user_id not found in users table: " + r.user_id.toString());
                }
            }

            types:HazardReport report = {
                id: r.id,
                title: r.title,
                description: r.description,
                hazard_type: r.hazard_type,
                severity_level: r.severity_level,
                status: r.status,
                images: r.images,
                location: location,
                created_at: r.created_at,
                updated_at: r.updated_at,
                submittedBy: submittedBy
            };
            typedReports.push(report);
        }

        types:ReportsResponse response = {
            status: "success",
            message: "Reports retrieved successfully",
            reports: typedReports
        };
        res.setPayload(response);
    }

    check caller->respond(res);
}

// Endpoint: GET /api/user/{id} - RDA can fetch any user's profile
public function handleGetUserProfile(http:Caller caller, http:Request req, int userId) returns error? {
    http:Response res = createCorsResponse();
    var userResult = database:getUserById(userId);
    if userResult is database:User {
        json userProfile = {
            id: userResult.id,
            firstName: userResult.first_name,
            lastName: userResult.last_name,
            contactNumber: userResult.contact_number ?: "",
            email: userResult.email,
            profileImage: userResult.profile_image ?: "",
            location: userResult.address,
            latitude: userResult.latitude,
            longitude: userResult.longitude,
            createdAt: userResult.created_at ?: ""
        };
        res.setPayload({ success: true, user: userProfile });
    } else {
        res.setPayload({ success: false, message: "User not found" });
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
    
    if (updateData?.title is ()) || (updateData?.hazard_type is ()) || (updateData?.severity_level is ()) {
        res.setPayload(createErrorResponse("Missing required fields"));
        check caller->respond(res);
        return;
    }
    
    string title = updateData?.title ?: "";
    string description = updateData?.description ?: "";
    string hazardType = updateData?.hazard_type ?: "";
    string severityLevel = updateData?.severity_level ?: "";
    
    var result = database:updateHazardReport(reportId, title, description, hazardType, severityLevel);
    
    if result is error {
        log:printError("Failed to update report: " + result.message());
        res.setPayload(createErrorResponse("Failed to update report: " + result.message()));
    } else {
        types:Location? location = ();
        // Fix: Properly handle optional location
        if result.location is record {| decimal lat; decimal lng; string? address; |} {
            record {| decimal lat; decimal lng; string? address; |} loc = <record {| decimal lat; decimal lng; string? address; |}>result.location;
            location = {
                lat: loc.lat,
                lng: loc.lng,
                address: loc.address
            };
        }
        
        types:HazardReport reportData = {
            id: result.id,
            title: result.title,
            description: result.description,
            hazard_type: result.hazard_type,
            severity_level: result.severity_level,
            status: result.status,
            images: result.images,
            location: location,
            created_at: result.created_at,
            updated_at: result.updated_at
        };
        
        types:UpdateReportResponse response = {
            status: "success",
            message: "Report updated successfully",
            data: reportData
        };
        res.setPayload(response);
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

function handleMultipartSubmission(http:Caller caller, http:Request req, http:Response res) returns error? {
    // First validate authentication
    string|http:HeaderNotFoundError authHeader = req.getHeader("Authorization");
    if authHeader is http:HeaderNotFoundError {
        res.setPayload(createErrorResponse("Authorization header required"));
        check caller->respond(res);
        return;
    }

    if !authHeader.startsWith("Bearer ") {
        res.setPayload(createErrorResponse("Invalid authorization header format"));
        check caller->respond(res);
        return;
    }

    string token = authHeader.substring(7);
    string|error userEmail = auth:validateJwtToken(token);
    if userEmail is error {
        res.setPayload(createErrorResponse("Invalid or expired token"));
        check caller->respond(res);
        return;
    }

    // Get user ID from email
    database:User|error user = database:getUserByEmail(userEmail);
    if user is error {
        res.setPayload(createErrorResponse("User not found"));
        check caller->respond(res);
        return;
    }

    mime:Entity[]|http:ClientError bodyPartsResult = req.getBodyParts();
    
    if bodyPartsResult is mime:Entity[] {
        MultipartData data = extractMultipartData(bodyPartsResult);
        
        if data.title == "" || data.hazardType == "" || data.severityLevel == "" {
            res.setPayload(createErrorResponse("Missing required fields: title, hazard_type, severity_level"));
            check caller->respond(res);
            return;
        }

        if data.imageNames.length() == 0 {
            res.setPayload(createErrorResponse("At least one image is required"));
            check caller->respond(res);
            return;
        }
        
        LocationData location = parseLocationData(data.latitude, data.longitude, data.address);
        
        int|error result = database:insertHazardReport(
            user.id,
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
    // Get current timestamp
    time:Utc currentTime = time:utcNow();
    string timestamp = time:utcToString(currentTime);
    
    string[] imageUrls = data.imageNames.map(name => "http://localhost:8080/api/images/" + name);
    
    log:printInfo("Report created successfully with ID: " + result.toString());
    
    types:ApiResponse response = {
        status: "success",
        message: "Report submitted successfully with " + data.imageNames.length().toString() + " images",
        report_id: result,
        images_uploaded: data.imageNames.length(),
        image_urls: imageUrls,
        timestamp: timestamp 
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
    // First validate authentication
    string|http:HeaderNotFoundError authHeader = req.getHeader("Authorization");
    if authHeader is http:HeaderNotFoundError {
        res.setPayload(createErrorResponse("Authorization header required"));
        check caller->respond(res);
        return;
    }

    if !authHeader.startsWith("Bearer ") {
        res.setPayload(createErrorResponse("Invalid authorization header format"));
        check caller->respond(res);
        return;
    }

    string token = authHeader.substring(7);
    string|error userEmail = auth:validateJwtToken(token);
    if userEmail is error {
        res.setPayload(createErrorResponse("Invalid or expired token"));
        check caller->respond(res);
        return;
    }

    // Get user ID from email
    database:User|error user = database:getUserByEmail(userEmail);
    if user is error {
        res.setPayload(createErrorResponse("User not found"));
        check caller->respond(res);
        return;
    }

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
    string description = report?.description ?: "";
    
    // Extract location data
    decimal? latitude = ();
    decimal? longitude = ();
    string? address = ();
    
    if report?.location is types:Location {
        types:Location loc = <types:Location>report?.location;
        latitude = loc.lat;
        longitude = loc.lng;
        address = loc?.address;
    }
    
    int|error result = database:insertHazardReport(
        user.id,
        report.title,
        description,
        report.hazard_type,
        report.severity_level,
        emptyImages,
        latitude,
        longitude,
        address
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

function getFileExtension(string filename) returns string {
    int? lastDotIndex = filename.lastIndexOf(".");
    if lastDotIndex is int && lastDotIndex > 0 {
        return filename.substring(lastDotIndex);
    }
    return ".jpg";
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