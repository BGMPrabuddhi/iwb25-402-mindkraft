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

const string API_VERSION = "1.0.0";
const string SERVICE_NAME = "SafeRoute Hazard Reports API";
const int DEFAULT_PAGE = 1;
const int DEFAULT_PAGE_SIZE = 20;

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

    resource function get health() returns json {
        boolean connected = database:testConnection();
        return {
            "status": connected ? "ok" : "error",
            "message": connected ? "Database connected successfully" : "Database connection failed",
            "service": SERVICE_NAME,
            "version": API_VERSION,
            "database_status": connected ? "connected" : "disconnected",
            "upload_directory": reports:getUploadDir()
        };
    }

    resource function options .(http:Caller caller, http:Request req) returns error? {
        check respondWithCorsHeaders(caller);
    }

    resource function post auth/register(user:RegisterRequest req) returns json {
        user:AuthResponse|error result = auth:register(req);
        if result is error {
            log:printError("Registration failed", result);
            return createErrorResponse("registration_failed", result.message());
        }
        
        return createSuccessAuthResponse(result);
    }

    resource function post auth/login(user:LoginRequest req) returns json {
        user:AuthResponse|error result = auth:login(req);
        if result is error {
            log:printError("Login failed", result);
            return createErrorResponse("login_failed", result.message());
        }
        
        return createSuccessAuthResponse(result);
    }

    resource function get me(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return createErrorResponse("unauthorized", "Authentication required");
        }

        user:UserProfile|error profile = auth:getUserProfile(email);
        if profile is error {
            log:printError("Failed to get user profile", profile);
            return createErrorResponse("internal_error", "Failed to retrieve user profile");
        }
        
        map<json> userResponse = createUserProfileResponse(profile);
        return {
            success: true,
            id: userResponse["id"],
            firstName: userResponse["firstName"],
            lastName: userResponse["lastName"],
            email: userResponse["email"],
            location: userResponse["location"],
            locationDetails: userResponse["locationDetails"],
            createdAt: userResponse["createdAt"],
            profileImage: userResponse.hasKey("profileImage") ? userResponse["profileImage"] : ()
        };
    }

    resource function put me(http:Request req, user:UpdateProfileRequest updateReq) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return createErrorResponse("unauthorized", "Authentication required");
        }

        user:UserProfile|error updatedProfile = auth:updateUserProfile(email, updateReq);
        if updatedProfile is error {
            log:printError("Failed to update user profile", updatedProfile);
            return createErrorResponse("update_failed", updatedProfile.message());
        }
        
        return {
            success: true,
            message: "Profile updated successfully",
            user: createUserProfileResponse(updatedProfile)
        };
    }

    resource function get home(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return createErrorResponse("unauthorized", "Authentication required");
        }

        return {
            success: true,
            message: "Welcome to your home page!",
            user: email,
            timestamp: getCurrentTimestamp()
        };
    }

    // ==================== PASSWORD RECOVERY ENDPOINTS ====================

    // Request password reset OTP
    resource function post auth/forgot\-password(user:ForgotPasswordRequest req) returns json {
        user:ForgotPasswordResponse|error result = auth:requestPasswordReset(req);
        if result is error {
            log:printError("Password reset request failed", result);
            return {
                success: false,
                message: "Failed to process password reset request",
                errorCode: "reset_request_failed"
            };
        }
        return {
            success: result.success,
            message: result.message,
            errorCode: result?.errorCode
        };
    }

    // Verify OTP
    resource function post auth/verify\-otp(user:VerifyOtpRequest req) returns json {
        user:VerifyOtpResponse|error result = auth:verifyOtp(req);
        if result is error {
            log:printError("OTP verification failed", result);
            return {
                success: false,
                message: "Failed to verify OTP",
                errorCode: "otp_verification_failed"
            };
        }
        return {
            success: result.success,
            message: result.message,
            resetToken: result?.resetToken,
            errorCode: result?.errorCode
        };
    }

    // Reset password
    resource function post auth/reset\-password(user:ResetPasswordRequest req) returns json {
        user:ResetPasswordResponse|error result = auth:resetPassword(req);
        if result is error {
            log:printError("Password reset failed", result);
            return {
                success: false,
                message: "Failed to reset password",
                errorCode: "password_reset_failed"
            };
        }
        return {
            success: result.success,
            message: result.message,
            errorCode: result?.errorCode
        };
    }

    // ==================== HAZARD REPORT ENDPOINTS ====================

    // Submit hazard report
    resource function post reports(http:Caller caller, http:Request req) returns error? {
        check reports:handleReportSubmission(caller, req);
    }

    resource function get reports/user(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return createErrorResponse("unauthorized", "Authentication required");
        }

        user:UserProfile|error profile = auth:getUserProfile(email);
        if profile is error {
            return createErrorResponse("internal_error", "Failed to retrieve user profile");
        }

        var reportsResult = database:getReportsByUserId(profile.id);
        if reportsResult is error {
            return createErrorResponse("internal_error", "Failed to retrieve user reports");
        }

        return {
            success: true,
            reports: <json>reportsResult,
            total_count: reportsResult.length()
        };
    }

    resource function get reports/nearby(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return createErrorResponse("unauthorized", "Authentication required");
        }

        user:UserProfile|error profile = auth:getUserProfile(email);
        if profile is error {
            return createErrorResponse("internal_error", "Failed to retrieve user profile");
        }

        map<string[]> queryParams = req.getQueryParams();
        decimal radiusKm = parseDecimalParam(getQueryParam(queryParams, "radius")) ?: 20.0;

        var reportsResult = database:getNearbyReports(
            profile.locationDetails.latitude, 
            profile.locationDetails.longitude, 
            radiusKm
        );
        
        if reportsResult is error {
            return createErrorResponse("internal_error", "Failed to retrieve nearby reports");
        }

        return {
            success: true,
            reports: <json>reportsResult,
            total_count: reportsResult.length(),
            user_location: {
                latitude: profile.locationDetails.latitude,
                longitude: profile.locationDetails.longitude,
                address: profile.locationDetails.address
            },
            radius_km: radiusKm
        };
    }

    resource function get reports(http:Caller caller, http:Request req) returns error? {
        ReportQueryParams params = extractReportQueryParams(req);
        
        var reportsResult = database:getFilteredHazardReports(
            params.hazardType, params.severity, params.status, 
            params.fromLat, params.fromLng, params.toLat, params.toLng, 
            params.page, params.pageSize
        );
        
        if reportsResult is error {
            check caller->respond({"status": "error", "message": reportsResult.toString()});
        } else {
            json response = {
                reports: <json>reportsResult,
                total_count: reportsResult.length(),
                page: params.page,
                page_size: params.pageSize
            };
            check caller->respond(response);
        }
    }

    resource function options reports/[int reportId](http:Caller caller, http:Request req) returns error? {
        check respondWithCorsHeaders(caller);
    }

    resource function put reports/[int reportId](http:Caller caller, http:Request req) returns error? {
        check reports:handleUpdateReport(caller, req, reportId);
    }

    resource function delete reports/[int reportId](http:Caller caller, http:Request req) returns error? {
        check reports:handleDeleteReport(caller, req, reportId);
    }

    resource function get images/[string filename](http:Caller caller, http:Request req) returns error? {
        check serveImage(caller, filename);
    }
}

@http:ServiceConfig {
    cors: {
        allowOrigins: corsOrigins,
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"]
    }
}
service / on new http:Listener(serverPort + 1) {
    
    resource function options .(http:Caller caller, http:Request req) returns error? {
        check respondWithCorsHeaders(caller);
    }

    resource function post reports(http:Caller caller, http:Request req) returns error? {
        check reports:handleReportSubmission(caller, req);
    }

    resource function get reports(http:Caller caller, http:Request req) returns error? {
        ReportQueryParams params = extractReportQueryParams(req);
        
        var reportsResult = database:getFilteredHazardReports(
            params.hazardType, params.severity, params.status, 
            params.fromLat, params.fromLng, params.toLat, params.toLng, 
            params.page, params.pageSize
        );
        
        if reportsResult is error {
            check caller->respond({"status": "error", "message": reportsResult.toString()});
        } else {
            json response = {
                reports: <json>reportsResult,
                total_count: reportsResult.length(),
                page: params.page,
                page_size: params.pageSize
            };
            check caller->respond(response);
        }
    }

    resource function get images/[string filename](http:Caller caller, http:Request req) returns error? {
        check serveImage(caller, filename);
    }

    resource function get health() returns json {
        boolean connected = database:testConnection();
        return {
            "status": connected ? "ok" : "error",
            "message": connected ? "Database connected successfully" : "Database connection failed",
            "service": "SafeRoute Direct API",
            "version": API_VERSION,
            "database_status": connected ? "connected" : "disconnected"
        };
    }
}

// Initialize database on startup
public function main() returns error? {
    check database:initializeDatabase();
    log:printInfo("Database initialized successfully");
    log:printInfo("SafeRoute API server started on port " + serverPort.toString());
}

type ReportQueryParams record {
    string hazardType;
    string severity;
    string status;
    decimal? fromLat;
    decimal? fromLng;
    decimal? toLat;
    decimal? toLng;
    int page;
    int pageSize;
};

function extractReportQueryParams(http:Request req) returns ReportQueryParams {
    map<string[]> queryParams = req.getQueryParams();
    
    return {
        hazardType: getQueryParam(queryParams, "hazard_type"),
        severity: getQueryParam(queryParams, "severity"),
        status: getQueryParam(queryParams, "status"),
        fromLat: parseDecimalParam(getQueryParam(queryParams, "from_lat")),
        fromLng: parseDecimalParam(getQueryParam(queryParams, "from_lng")),
        toLat: parseDecimalParam(getQueryParam(queryParams, "to_lat")),
        toLng: parseDecimalParam(getQueryParam(queryParams, "to_lng")),
        page: parseIntParam(getQueryParam(queryParams, "page"), DEFAULT_PAGE),
        pageSize: parseIntParam(getQueryParam(queryParams, "page_size"), DEFAULT_PAGE_SIZE)
    };
}

function getQueryParam(map<string[]> queryParams, string key) returns string {
    return queryParams[key] is string[] ? queryParams.get(key)[0] : "";
}

function parseIntParam(string value, int defaultValue) returns int {
    if value == "" {
        return defaultValue;
    }
    int|error result = int:fromString(value);
    return result is int ? result : defaultValue;
}

function parseDecimalParam(string value) returns decimal? {
    if value == "" {
        return ();
    }
    decimal|error result = decimal:fromString(value);
    return result is decimal ? result : ();
}

function validateAuthHeader(http:Request req) returns string|error {
    string|http:HeaderNotFoundError authHeader = req.getHeader("Authorization");
    if authHeader is http:HeaderNotFoundError {
        return error("Authorization header not found");
    }

    if !authHeader.startsWith("Bearer ") {
        return error("Invalid authorization header format");
    }

    string token = authHeader.substring(7);
    return auth:validateJwtToken(token);
}

function getCurrentTimestamp() returns string {
    time:Utc currentTime = time:utcNow();
    return time:utcToString(currentTime);
}

function createErrorResponse(string errorCode, string message) returns json {
    return {
        success: false,
        message: message,
        errorCode: errorCode
    };
}

function createSuccessAuthResponse(user:AuthResponse authResponse) returns json {
    return {
        success: true,
        token: authResponse.token,
        tokenType: authResponse.tokenType,
        expiresIn: authResponse.expiresIn,
        message: authResponse.message
    };
}

function createUserProfileResponse(user:UserProfile profile) returns map<json> {
    map<json> response = {
        id: profile.id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        location: profile.locationDetails.address, // Add location field for backward compatibility
        locationDetails: {
            latitude: profile.locationDetails.latitude,
            longitude: profile.locationDetails.longitude,
            address: profile.locationDetails.address
        },
        createdAt: profile.createdAt
    };
    
    string? profileImage = profile?.profileImage;
    if profileImage is string {
        response["profileImage"] = profileImage;
    }
    
    return response;
}

function respondWithCorsHeaders(http:Caller caller) returns error? {
    http:Response res = new;
    res.statusCode = 200;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    check caller->respond(res);
}

function serveImage(http:Caller caller, string filename) returns error? {
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