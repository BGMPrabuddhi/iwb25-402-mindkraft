import ballerina/http;
import ballerina/log;
import ballerina/mime;
import ballerina/file;
import ballerina/io;
import ballerina/uuid;
import saferoute/backend.types;
import saferoute/backend.database;

configurable string uploadDir = "uploads";

// Upload functionality
public function initializeUploadDirectory() returns error? {
    boolean dirExists = check file:test(uploadDir, file:EXISTS);
    if !dirExists {
        check file:createDir(uploadDir);
        log:printInfo("Created upload directory: " + uploadDir);
    }
}

public function saveImageFile(mime:Entity part) returns string|error {
    mime:ContentDisposition contentDisposition = part.getContentDisposition();
    string originalFileName = "";
    
    if contentDisposition.fileName is string {
        originalFileName = contentDisposition.fileName;
    }
    
    if originalFileName == "" {
        return error("No filename provided");
    }
    
    string fileExtension = ".jpg";
    int? lastDotIndex = originalFileName.lastIndexOf(".");
    if lastDotIndex is int && lastDotIndex > 0 {
        fileExtension = originalFileName.substring(lastDotIndex);
    }
    
    string uniqueFileName = uuid:createType4AsString() + fileExtension;
    string filePath = uploadDir + "/" + uniqueFileName;
    
    byte[]|mime:ParserError bytesResult = part.getByteArray();
    if bytesResult is byte[] {
        io:Error? writeResult = io:fileWriteBytes(filePath, bytesResult);
        if writeResult is () {
            log:printInfo("Image uploaded: " + originalFileName + " -> " + uniqueFileName);
            return uniqueFileName;
        } else {
            return error("Failed to write file: " + writeResult.message());
        }
    } else {
        return error("Failed to read image bytes");
    }
}

public function getImageContentType(string filename) returns string {
    if filename.endsWith(".jpg") || filename.endsWith(".jpeg") {
        return "image/jpeg";
    } else if filename.endsWith(".png") {
        return "image/png";
    } else if filename.endsWith(".gif") {
        return "image/gif";
    } else if filename.endsWith(".webp") {
        return "image/webp";
    }
    return "application/octet-stream";
}

public function getUploadDir() returns string {
    return uploadDir;
}

// Report handling functionality
public function handleReportSubmission(http:Caller caller, http:Request req) returns error? {
    http:Response res = new;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    string contentType = req.getContentType();
    log:printInfo("Content-Type: " + contentType);

    if contentType.includes("multipart/form-data") {
        check handleMultipartSubmission(caller, req, res);
    } else {
        check handleJsonSubmission(caller, req, res);
    }
}

function handleMultipartSubmission(http:Caller caller, http:Request req, http:Response res) returns error? {
    string[] imageNames = [];
    mime:Entity[]|http:ClientError bodyPartsResult = req.getBodyParts();
    string latitude = "";
    string longitude = "";
    string address = "";
    
    if bodyPartsResult is mime:Entity[] {
        string title = "";
        string hazardType = "";
        string severityLevel = "";
        string description = "";
        
        foreach mime:Entity part in bodyPartsResult {
            mime:ContentDisposition contentDisposition = part.getContentDisposition();
            string partName = contentDisposition.name;
            
            if partName == "images" {
                string|error savedFileName = saveImageFile(part);
                if savedFileName is string {
                    imageNames.push(savedFileName);
                    log:printInfo("Image saved: " + savedFileName);
                } else {
                    log:printError("Image save failed: " + savedFileName.message());
                    res.setPayload({"status": "error", "message": savedFileName.message()});
                    check caller->respond(res);
                    return;
                }
            } else if partName == "title" {
                string|mime:ParserError textResult = part.getText();
                if textResult is string {
                    title = textResult;
                    log:printInfo("Title: " + title);
                }
            } else if partName == "hazard_type" {
                string|mime:ParserError textResult = part.getText();
                if textResult is string {
                    hazardType = textResult;
                    log:printInfo("Hazard Type: " + hazardType);
                }
            } else if partName == "severity_level" {
                string|mime:ParserError textResult = part.getText();
                if textResult is string {
                    severityLevel = textResult;
                    log:printInfo("Severity: " + severityLevel);
                }
            } else if partName == "description" {
                string|mime:ParserError textResult = part.getText();
                if textResult is string {
                    description = textResult;
                    log:printInfo("Description: " + description);
                }
            } else if partName == "latitude" {
                string|mime:ParserError textResult = part.getText();
                if textResult is string {
                    latitude = textResult;
                    log:printInfo("Latitude: " + latitude);
                }
            } else if partName == "longitude" {
                string|mime:ParserError textResult = part.getText();
                if textResult is string {
                    longitude = textResult;
                    log:printInfo("Longitude: " + longitude);
                }
            } else if partName == "address" {
                string|mime:ParserError textResult = part.getText();
                if textResult is string {
                    address = textResult;
                    log:printInfo("Address: " + address);
                }
            }
        }
        
        // Validate required fields
        if title == "" || hazardType == "" || severityLevel == "" {
            res.setPayload({"status": "error", "message": "Missing required fields: title, hazard_type, severity_level"});
            check caller->respond(res);
            return;
        }
        
        // Convert location strings to decimals for database
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
        
        // Try to insert into database (or use mock)
        int|error result = database:insertHazardReport(title, description, hazardType, severityLevel, imageNames, latDecimal, lngDecimal, address);
        
        if result is int {
            string[] imageUrls = imageNames.map(name => "http://localhost:8080/api/images/" + name);
            
            log:printInfo("Report created successfully with ID: " + result.toString());
            log:printInfo("Summary: " + imageNames.length().toString() + " images, Location: " + address);
            
            types:ApiResponse response = {
                status: "success",
                message: "Report submitted successfully with " + imageNames.length().toString() + " images",
                report_id: result,
                images_uploaded: imageNames.length(),
                image_urls: imageUrls
            };
            res.setPayload(response);
            check caller->respond(res);
        } else {
            log:printError("Database error: " + result.toString());
            res.setPayload({"status": "error", "message": "Database error: " + result.toString()});
            check caller->respond(res);
        }
    } else {
        res.setPayload({"status": "error", "message": "Invalid multipart payload"});
        check caller->respond(res);
    }
}

function handleJsonSubmission(http:Caller caller, http:Request req, http:Response res) returns error? {
    json|error body = req.getJsonPayload();
    if body is error {
        res.setPayload({"status": "error", "message": "Invalid JSON payload"});
        check caller->respond(res);
        return;
    }
    
    types:HazardReportPayload|error report = body.cloneWithType(types:HazardReportPayload);
    if report is error {
        res.setPayload({"status": "error", "message": "Invalid report data"});
        check caller->respond(res);
        return;
    }
    
    string[] emptyImages = [];
    decimal? latitude = ();
    decimal? longitude = ();
    string? address = ();
    
    // Handle optional location safely
    if report.location is types:LocationPayload {
        types:LocationPayload loc = <types:LocationPayload>report.location;
        latitude = loc.lat;
        longitude = loc.lng;
        address = loc.address;
    }
    
    int|error result = database:insertHazardReport(
        report.title, 
        report.description ?: "", 
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
        check caller->respond(res);
    } else {
        res.setPayload({"status": "error", "message": result.toString()});
        check caller->respond(res);
    }
}