import ballerina/http;
import ballerina/log;
import ballerina/sql;
import ballerinax/postgresql;
import ballerina/io;
import ballerina/mime;
import ballerina/file;
import ballerina/uuid;

configurable string uploadDir = "uploads";
configurable string host = "localhost";
configurable int port = 5432;
configurable string name = "saferoute_db";
configurable string username = "postgres";
configurable string password = "postgres";

final postgresql:Client dbClient = check new (
    host = host,
    port = port,
    database = name,
    username = username,
    password = password,
    connectionPool = {
        maxOpenConnections: 15,
        minIdleConnections: 5
    },
    options = {
        connectTimeout: 30,
        socketTimeout: 30
    }
);

type HazardReportPayload record {
    string title;
    string? description;
    string hazard_type;
    string severity_level;
    string[]? images;
};

// Initialize upload directory
function initializeUploadDirectory() returns error? {
    boolean dirExists = check file:test(uploadDir, file:EXISTS);
    if !dirExists {
        check file:createDir(uploadDir);
        log:printInfo("Created upload directory: " + uploadDir);
    }
}

function insertHazardReport(
    postgresql:Client dbClient,
    string title,
    string description,
    string hazardType,
    string severityLevel
) returns int|error {
    sql:ParameterizedQuery pq = `INSERT INTO hazard_reports (title, description, hazard_type, severity_level) VALUES (${title}, ${description}, ${hazardType}, ${severityLevel}) RETURNING id`;
    int|sql:Error result = dbClient->queryRow(pq, int);
    if result is int {
        log:printInfo("Hazard report inserted with ID: " + result.toString());
        return result;
    } else {
        log:printError("Failed to insert hazard report", result);
        return result;
    }
}

service /api on new http:Listener(8080) {
    
    function init() returns error? {
        check initializeUploadDirectory();
    }

    resource function get health() returns json|error {
        stream<record{}, sql:Error?> resultStream = check dbClient->query(`SELECT 1`);
        error? err = resultStream.close();
        if err is error {
            log:printError("Database connection test failed", err);
            return {"status": "error", "message": "Database connection failed"};
        }
        log:printInfo("Database connection test successful");
        return {
            "status": "ok", 
            "message": "Database connected successfully",
            "service": "SafeRoute Hazard Reports API",
            "version": "1.0.0",
            "upload_directory": uploadDir
        };
    }

    resource function options reports(http:Caller caller, http:Request req) returns error? {
        http:Response res = new;
        res.statusCode = 200;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        check caller->respond(res);
    }

    resource function post reports(http:Caller caller, http:Request req) returns error? {
        http:Response res = new;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

        string contentType = req.getContentType();
        log:printInfo("Content-Type: " + contentType);

        if contentType.includes("multipart/form-data") {
            // Handle multipart form data (with images)
            string[] imageNames = [];
            mime:Entity[]|http:ClientError bodyPartsResult = req.getBodyParts();
            
            if bodyPartsResult is mime:Entity[] {
                string title = "";
                string hazardType = "";
                string severityLevel = "";
                string description = "";
                
                foreach mime:Entity part in bodyPartsResult {
                    mime:ContentDisposition contentDisposition = part.getContentDisposition();
                    string partName = contentDisposition.name;
                    
                    if partName == "images" {
                        // Handle image upload
                        string originalFileName = "";
                        if contentDisposition.fileName is string {
                            originalFileName = contentDisposition.fileName;
                        }
                        
                        if originalFileName != "" {
                            // Generate unique filename
                            string fileExtension = "";
                            int? lastDotIndex = originalFileName.lastIndexOf(".");
                            if lastDotIndex is int && lastDotIndex > 0 {
                                fileExtension = originalFileName.substring(lastDotIndex);
                            } else {
                                fileExtension = ".jpg"; // default extension
                            }
                            
                            string uniqueFileName = uuid:createType4AsString() + fileExtension;
                            string filePath = uploadDir + "/" + uniqueFileName;
                            
                            byte[]|mime:ParserError bytesResult = part.getByteArray();
                            if bytesResult is byte[] {
                                io:Error? writeResult = io:fileWriteBytes(filePath, bytesResult);
                                if writeResult is io:Error {
                                    res.setPayload({"status": "error", "message": writeResult.message()});
                                    check caller->respond(res);
                                    return;
                                }
                                imageNames.push(uniqueFileName);
                                log:printInfo("Uploaded image: " + originalFileName + " -> " + uniqueFileName);
                            }
                        }
                    } else if partName == "title" {
                        string|mime:ParserError textResult = part.getText();
                        if textResult is string {
                            title = textResult;
                        }
                    } else if partName == "hazard_type" {
                        string|mime:ParserError textResult = part.getText();
                        if textResult is string {
                            hazardType = textResult;
                        }
                    } else if partName == "severity_level" {
                        string|mime:ParserError textResult = part.getText();
                        if textResult is string {
                            severityLevel = textResult;
                        }
                    } else if partName == "description" {
                        string|mime:ParserError textResult = part.getText();
                        if textResult is string {
                            description = textResult;
                        }
                    }
                }
                
                // Validate required fields
                if title == "" || hazardType == "" || severityLevel == "" {
                    res.setPayload({"status": "error", "message": "Missing required fields: title, hazard_type, severity_level"});
                    check caller->respond(res);
                    return;
                }
                
                // Insert report with image filenames
                sql:ParameterizedQuery pq = `INSERT INTO hazard_reports (title, description, hazard_type, severity_level, images) VALUES (${title}, ${description}, ${hazardType}, ${severityLevel}, ${imageNames}) RETURNING id`;
                int|sql:Error result = dbClient->queryRow(pq, int);
                if result is int {
                    string[] imageUrls = imageNames.map(name => "http://localhost:8080/api/images/" + name);
                    res.setPayload({
                        "status": "success",
                        "message": "Report submitted successfully with " + imageNames.length().toString() + " images",
                        "report_id": result,
                        "images_uploaded": imageNames.length(),
                        "image_urls": imageUrls
                    });
                    check caller->respond(res);
                } else {
                    res.setPayload({"status": "error", "message": result.toString()});
                    check caller->respond(res);
                }
            } else {
                res.setPayload({"status": "error", "message": "Invalid multipart payload"});
                check caller->respond(res);
            }
        } else {
            // Handle JSON payload (no images)
            json|error body = req.getJsonPayload();
            if body is error {
                res.setPayload({"status": "error", "message": "Invalid JSON payload"});
                check caller->respond(res);
                return;
            }
            
            HazardReportPayload|error report = body.cloneWithType(HazardReportPayload);
            if report is error {
                res.setPayload({"status": "error", "message": "Invalid report data"});
                check caller->respond(res);
                return;
            }
            
            string[] emptyImages = [];
            sql:ParameterizedQuery pq = `INSERT INTO hazard_reports (title, description, hazard_type, severity_level, images) VALUES (${report.title}, ${report.description ?: ""}, ${report.hazard_type}, ${report.severity_level}, ${emptyImages}) RETURNING id`;
            int|sql:Error result = dbClient->queryRow(pq, int);
            if result is int {
                res.setPayload({"status": "success", "message": "Report submitted successfully", "report_id": result});
                check caller->respond(res);
            } else {
                res.setPayload({"status": "error", "message": result.toString()});
                check caller->respond(res);
            }
        }
    }

    // Serve uploaded images
    resource function get images/[string filename](http:Caller caller, http:Request req) returns error? {
        string filePath = uploadDir + "/" + filename;
        
        boolean fileExists = check file:test(filePath, file:EXISTS);
        if !fileExists {
            http:Response res = new;
            res.statusCode = 404;
            res.setPayload({"error": "Image not found"});
            check caller->respond(res);
            return;
        }

        // Determine content type based on file extension
        string contentType = "application/octet-stream";
        if filename.endsWith(".jpg") || filename.endsWith(".jpeg") {
            contentType = "image/jpeg";
        } else if filename.endsWith(".png") {
            contentType = "image/png";
        } else if filename.endsWith(".gif") {
            contentType = "image/gif";
        } else if filename.endsWith(".webp") {
            contentType = "image/webp";
        }

        byte[] imageBytes = check io:fileReadBytes(filePath);
        
        http:Response res = new;
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
        res.setBinaryPayload(imageBytes);
        check caller->respond(res);
    }
}