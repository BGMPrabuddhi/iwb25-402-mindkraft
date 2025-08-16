import ballerina/http;
import ballerina/file;
import ballerina/io;
import saferoute/backend.database;
import saferoute/backend.reports;
import saferoute/backend.types;

@http:ServiceConfig {
            cors: {
                allowOrigins: ["http://localhost:3000"],
                allowMethods: ["GET", "POST", "OPTIONS"],
                allowHeaders: ["Content-Type"]
            }
        }
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

    // Get filtered hazard reports for route viewer
    resource function get reports(http:Caller caller, http:Request req) returns error? {
    map<string[]> queryParams = req.getQueryParams();
    string hazardType = queryParams.hasKey("hazard_type") && queryParams.get("hazard_type") is string[] ? queryParams.get("hazard_type")[0] : "";
    string severity = queryParams.hasKey("severity") && queryParams.get("severity") is string[] ? queryParams.get("severity")[0] : "";
    string status = queryParams.hasKey("status") && queryParams.get("status") is string[] ? queryParams.get("status")[0] : "";
    string fromLatStr = queryParams.hasKey("from_lat") && queryParams.get("from_lat") is string[] ? queryParams.get("from_lat")[0] : "";
    string fromLngStr = queryParams.hasKey("from_lng") && queryParams.get("from_lng") is string[] ? queryParams.get("from_lng")[0] : "";
    string toLatStr = queryParams.hasKey("to_lat") && queryParams.get("to_lat") is string[] ? queryParams.get("to_lat")[0] : "";
    string toLngStr = queryParams.hasKey("to_lng") && queryParams.get("to_lng") is string[] ? queryParams.get("to_lng")[0] : "";
    string pageStr = queryParams.hasKey("page") && queryParams.get("page") is string[] ? queryParams.get("page")[0] : "1";
    string pageSizeStr = queryParams.hasKey("page_size") && queryParams.get("page_size") is string[] ? queryParams.get("page_size")[0] : "20";

        int page = 1;
        int pageSize = 20;
        decimal? fromLat = ();
        decimal? fromLng = ();
        decimal? toLat = ();
        decimal? toLng = ();

        int|error pageConv = int:fromString(pageStr);
        if pageConv is int { page = pageConv; }
        int|error pageSizeConv = int:fromString(pageSizeStr);
        if pageSizeConv is int { pageSize = pageSizeConv; }

        if fromLatStr != "" {
            decimal|error conv = decimal:fromString(fromLatStr);
            if conv is decimal { fromLat = conv; }
        }
        if fromLngStr != "" {
            decimal|error conv = decimal:fromString(fromLngStr);
            if conv is decimal { fromLng = conv; }
        }
        if toLatStr != "" {
            decimal|error conv = decimal:fromString(toLatStr);
            if conv is decimal { toLat = conv; }
        }
        if toLngStr != "" {
            decimal|error conv = decimal:fromString(toLngStr);
            if conv is decimal { toLng = conv; }
        }

        types:HazardReport[]|error reportsResult = database:getFilteredHazardReports(
            hazardType, severity, status, fromLat, fromLng, toLat, toLng, page, pageSize
        );
        if reportsResult is types:HazardReport[] {
            json response = {
                reports: <json>reportsResult,
                total_count: reportsResult.length(),
                page: page,
                page_size: pageSize
            };
            check caller->respond(response);
        } else {
            check caller->respond({"status": "error", "message": reportsResult.toString()});
        }
    }

    // Serve uploaded images
    resource function get images/[string filename](http:Caller caller, http:Request req) returns error? {
        string filePath = reports:getUploadDir() + "/" + filename;
        
        boolean|file:Error fileExists = file:test(filePath, file:EXISTS);
        if fileExists is file:Error || !fileExists {
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