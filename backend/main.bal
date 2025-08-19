import ballerina/http;
import ballerina/log;
import ballerina/time;
import ballerina/file;
import ballerina/io;
import saferoute/backend.database;
import saferoute/backend.reports;
import saferoute/backend.auth;
import saferoute/backend.user;

configurable int serverPort = ?;
configurable string[] corsOrigins = ?;

listener http:Listener apiListener = new (serverPort);

@http:ServiceConfig {
    cors: {
        allowOrigins: corsOrigins,
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"]
    }
}
service /api on apiListener {
    
    function init() returns error? {
        check reports:initializeUploadDirectory();
        check reports:initializeCleanupTask();
    }

    // Health check endpoint
    resource function get health() returns json {
        boolean connected = database:testConnection();
        if !connected {
            return {
                "status": "error", 
                "message": "Database connection failed",
                "service": "SafeRoute Hazard Reports API",
                "version": "1.0.0",
                "database_status": "disconnected",
                "upload_directory": reports:getUploadDir()
            };
        }
        
        return {
            "status": "ok", 
            "message": "Database connected successfully",
            "service": "SafeRoute Hazard Reports API",
            "version": "1.0.0",
            "database_status": "connected",
            "upload_directory": reports:getUploadDir()
        };
    }

    // CORS preflight handler
    resource function options .(http:Caller caller, http:Request req) returns error? {
        http:Response res = new;
        res.statusCode = 200;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        check caller->respond(res);
    }

    // ==================== AUTH ENDPOINTS ====================

    // User registration
    resource function post auth/register(user:RegisterRequest req) returns json {
        user:AuthResponse|error result = auth:register(req);
        if result is error {
            log:printError("Registration failed", result);
            return {
                success: false,
                message: result.message(),
                errorCode: "registration_failed"
            };
        }
        return {
            success: true,
            token: result.token,
            tokenType: result.tokenType,
            expiresIn: result.expiresIn,
            message: result.message
        };
    }

    // User login
    resource function post auth/login(user:LoginRequest req) returns json {
        user:AuthResponse|error result = auth:login(req);
        if result is error {
            log:printError("Login failed", result);
            return {
                success: false,
                message: result.message(),
                errorCode: "login_failed"
            };
        }
        return {
            success: true,
            token: result.token,
            tokenType: result.tokenType,
            expiresIn: result.expiresIn,
            message: result.message
        };
    }

    // Get user profile
    resource function get me(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return {
                success: false,
                message: "Authentication required",
                errorCode: "unauthorized"
            };
        }

        user:UserProfile|error profile = auth:getUserProfile(email);
        if profile is error {
            log:printError("Failed to get user profile", profile);
            return {
                success: false,
                message: "Failed to retrieve user profile",
                errorCode: "internal_error"
            };
        }
        
        map<json> response = {
            success: true,
            id: profile.id,
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            location: profile.location,
            locationDetails: {
                latitude: profile.locationDetails.latitude,
                longitude: profile.locationDetails.longitude,
                city: profile.locationDetails.city,
                state: profile.locationDetails.state,
                country: profile.locationDetails.country,
                fullAddress: profile.locationDetails.fullAddress
            },
            createdAt: profile.createdAt
        };
        
        // Add profile image if available
        string? profileImage = profile?.profileImage;
        if profileImage is string {
            response["profileImage"] = profileImage;
        }
        
        return response;
    }

    // Update user profile
    resource function put me(http:Request req, user:UpdateProfileRequest updateReq) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return {
                success: false,
                message: "Authentication required",
                errorCode: "unauthorized"
            };
        }

        user:UserProfile|error updatedProfile = auth:updateUserProfile(email, updateReq);
        if updatedProfile is error {
            log:printError("Failed to update user profile", updatedProfile);
            return {
                success: false,
                message: updatedProfile.message(),
                errorCode: "update_failed"
            };
        }
        
        map<json> userResponse = {
            id: updatedProfile.id,
            firstName: updatedProfile.firstName,
            lastName: updatedProfile.lastName,
            email: updatedProfile.email,
            location: updatedProfile.location,
            locationDetails: {
                latitude: updatedProfile.locationDetails.latitude,
                longitude: updatedProfile.locationDetails.longitude,
                city: updatedProfile.locationDetails.city,
                state: updatedProfile.locationDetails.state,
                country: updatedProfile.locationDetails.country,
                fullAddress: updatedProfile.locationDetails.fullAddress
            },
            createdAt: updatedProfile.createdAt
        };
        
        // Add profile image if available
        string? updatedProfileImage = updatedProfile?.profileImage;
        if updatedProfileImage is string {
            userResponse["profileImage"] = updatedProfileImage;
        }
        
        return {
            success: true,
            message: "Profile updated successfully",
            user: userResponse
        };
    }

    // Protected home endpoint
    resource function get home(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return {
                success: false,
                message: "Authentication required",
                errorCode: "unauthorized"
            };
        }

        return {
            success: true,
            message: "Welcome to your home page!",
            user: email,
            timestamp: getCurrentTimestamp()
        };
    }

    // ==================== HAZARD REPORT ENDPOINTS ====================

    // Submit hazard report
    resource function post reports(http:Caller caller, http:Request req) returns error? {
        check reports:handleReportSubmission(caller, req);
    }

    // Get filtered hazard reports
    resource function get reports(http:Caller caller, http:Request req) returns error? {
        map<string[]> queryParams = req.getQueryParams();
        string hazardType = queryParams["hazard_type"] is string[] ? queryParams.get("hazard_type")[0] : "";
        string severity = queryParams["severity"] is string[] ? queryParams.get("severity")[0] : "";
        string status = queryParams["status"] is string[] ? queryParams.get("status")[0] : "";
        string fromLatStr = queryParams["from_lat"] is string[] ? queryParams.get("from_lat")[0] : "";
        string fromLngStr = queryParams["from_lng"] is string[] ? queryParams.get("from_lng")[0] : "";
        string toLatStr = queryParams["to_lat"] is string[] ? queryParams.get("to_lat")[0] : "";
        string toLngStr = queryParams["to_lng"] is string[] ? queryParams.get("to_lng")[0] : "";
        string pageStr = queryParams["page"] is string[] ? queryParams.get("page")[0] : "1";
        string pageSizeStr = queryParams["page_size"] is string[] ? queryParams.get("page_size")[0] : "20";

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

        var reportsResult = database:getFilteredHazardReports(
            hazardType, severity, status, fromLat, fromLng, toLat, toLng, page, pageSize
        );
        
        if reportsResult is error {
            check caller->respond({"status": "error", "message": reportsResult.toString()});
        } else {
            json response = {
                reports: <json>reportsResult,
                total_count: reportsResult.length(),
                page: page,
                page_size: pageSize
            };
            check caller->respond(response);
        }
    resource function get reports(http:Caller caller, http:Request req) returns error? {
        check reports:handleGetReports(caller, req);
    }

    resource function options reports/[int reportId](http:Caller caller, http:Request req) returns error? {
        http:Response res = new;
        res.statusCode = 200;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        check caller->respond(res);
    }

    resource function put reports/[int reportId](http:Caller caller, http:Request req) returns error? {
        check reports:handleUpdateReport(caller, req, reportId);
    }

    resource function delete reports/[int reportId](http:Caller caller, http:Request req) returns error? {
        check reports:handleDeleteReport(caller, req, reportId);
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

// Root service to handle direct /reports calls
@http:ServiceConfig {
    cors: {
        allowOrigins: corsOrigins,
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"]
    }
}
service / on new http:Listener(serverPort + 1) {
    
    // CORS preflight handler
    resource function options .(http:Caller caller, http:Request req) returns error? {
        http:Response res = new;
        res.statusCode = 200;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        check caller->respond(res);
    }

    // Submit hazard report
    resource function post reports(http:Caller caller, http:Request req) returns error? {
        check reports:handleReportSubmission(caller, req);
    }

    // Get filtered hazard reports
    resource function get reports(http:Caller caller, http:Request req) returns error? {
        map<string[]> queryParams = req.getQueryParams();
        string hazardType = queryParams["hazard_type"] is string[] ? queryParams.get("hazard_type")[0] : "";
        string severity = queryParams["severity"] is string[] ? queryParams.get("severity")[0] : "";
        string status = queryParams["status"] is string[] ? queryParams.get("status")[0] : "";
        string fromLatStr = queryParams["from_lat"] is string[] ? queryParams.get("from_lat")[0] : "";
        string fromLngStr = queryParams["from_lng"] is string[] ? queryParams.get("from_lng")[0] : "";
        string toLatStr = queryParams["to_lat"] is string[] ? queryParams.get("to_lat")[0] : "";
        string toLngStr = queryParams["to_lng"] is string[] ? queryParams.get("to_lng")[0] : "";
        string pageStr = queryParams["page"] is string[] ? queryParams.get("page")[0] : "1";
        string pageSizeStr = queryParams["page_size"] is string[] ? queryParams.get("page_size")[0] : "20";

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

        var reportsResult = database:getFilteredHazardReports(
            hazardType, severity, status, fromLat, fromLng, toLat, toLng, page, pageSize
        );
        
        if reportsResult is error {
            check caller->respond({"status": "error", "message": reportsResult.toString()});
        } else {
            json response = {
                reports: <json>reportsResult,
                total_count: reportsResult.length(),
                page: page,
                page_size: pageSize
            };
            check caller->respond(response);
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

    // Health check
    resource function get health() returns json {
        boolean connected = database:testConnection();
        if !connected {
            return {
                "status": "error", 
                "message": "Database connection failed",
                "service": "SafeRoute Direct API",
                "version": "1.0.0",
                "database_status": "disconnected"
            };
        }
        
        return {
            "status": "ok", 
            "message": "Database connected successfully",
            "service": "SafeRoute Direct API",
            "version": "1.0.0",
            "database_status": "connected"
        };
    }
}

// Initialize database on startup
public function main() returns error? {
    check database:initializeDatabase();
    log:printInfo("Database initialized successfully");
    log:printInfo("API server started on port " + serverPort.toString());
    log:printInfo("Direct server started on port " + (serverPort + 1).toString());
}

// Helper functions
function validateAuthHeader(http:Request req) returns string|error {
    string|http:HeaderNotFoundError authHeader = req.getHeader("Authorization");
    if authHeader is http:HeaderNotFoundError {
        return error("Authorization header not found");
    }

    if !authHeader.startsWith("Bearer ") {
        return error("Invalid authorization header format");
    }

    string token = authHeader.substring(7); // Remove "Bearer " prefix
    return auth:validateJwtToken(token);
}

function getCurrentTimestamp() returns string {
    time:Utc currentTime = time:utcNow();
    return time:utcToString(currentTime);
}