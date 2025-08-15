import ballerina/http;
import ballerina/file;
import ballerina/io;
import saferoute/backend.database;
import saferoute/backend.reports;

service /api on new http:Listener(8080) {
    
    function init() returns error? {
        check reports:initializeUploadDirectory();
    }

    resource function get health() returns json {
        boolean connected = database:testConnection();
        if !connected {
            return {
                "status": "error", 
                "message": "Database connection failed",
                "service": "SafeRoute Hazard Reports API",
                "version": "1.0.0",
                "java_version": "Ballerina 2201.8.0",
                "database_status": "disconnected",
                "upload_directory": reports:getUploadDir()
            };
        }
        
        return {
            "status": "ok", 
            "message": "Database connected successfully",
            "service": "SafeRoute Hazard Reports API",
            "version": "1.0.0",
            "java_version": "Ballerina 2201.8.0",
            "database_status": "connected",
            "upload_directory": reports:getUploadDir()
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
        check reports:handleReportSubmission(caller, req);
    }

    // Serve uploaded images
    resource function get images/[string filename](http:Caller caller, http:Request req) returns error? {
        string filePath = reports:getUploadDir() + "/" + filename;
        
        boolean fileExists = check file:test(filePath, file:EXISTS);
        if !fileExists {
            http:Response res = new;
            res.statusCode = 404;
            res.setPayload({"error": "Image not found"});
            check caller->respond(res);
            return;
        }

        string contentType = reports:getImageContentType(filename);
        byte[] imageBytes = check io:fileReadBytes(filePath);
        
        http:Response res = new;
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=31536000");
        res.setBinaryPayload(imageBytes);
        check caller->respond(res);
    }
}