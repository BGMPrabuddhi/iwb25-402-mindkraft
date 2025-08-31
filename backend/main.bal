import ballerina/http;
import ballerina/log;
import ballerina/time;
import ballerina/file;
import ballerina/io;
import ballerina/sql;
import ballerinax/postgresql;
import ballerina/mime;

import saferoute/backend.database;
import saferoute/backend.reports;
import saferoute/backend.user;
import saferoute/backend.auth as auth;

/// Error type representing authentication related failures.
public type AuthError distinct error;

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

    // ============ AUTH ENDPOINTS ============
    
    resource function post auth/register(user:RegisterRequest req) returns json {
        user:AuthResponse|error result = auth:register(req);
        if result is error {
            log:printError("Registration failed", result);
            return createErrorResponse("registration_failed", result.message());
        }
        
        return {
            success: true,
            message: result.message,
            requiresVerification: true
        };
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
            userRole: profile.userRole,
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

    resource function post me/profile_image(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return createErrorResponse("unauthorized", "Authentication required");
        }
        
        database:User|error userRec = database:getUserByEmail(email);
        if userRec is error { 
            return createErrorResponse("not_found", "User not found"); 
        }

        string contentType = req.getContentType();
        if !contentType.includes("multipart/form-data") {
            return createErrorResponse("invalid_request", "Expected multipart/form-data");
        }
        
        mime:Entity[]|http:ClientError partsRes = req.getBodyParts();
        if partsRes is http:ClientError { 
            return createErrorResponse("invalid_payload", "Cannot read body parts"); 
        }

        mime:Entity? imagePart = (); 
        foreach var p in partsRes { 
            mime:ContentDisposition cd = p.getContentDisposition();
            if cd.name == "image" { 
                imagePart = p; 
                break; 
            }
        }
        if imagePart is () { 
            return createErrorResponse("missing_field", "Field 'image' required"); 
        }

        string|error saved = reports:saveImageFile(<mime:Entity>imagePart);
        if saved is error { 
            return createErrorResponse("upload_failed", saved.message()); 
        }

        boolean|error upd = database:updateUserProfileImage(userRec.id, saved);
        if upd is error { 
            return createErrorResponse("update_failed", upd.message()); 
        }

        return { 
            success: true, 
            message: "Profile image updated", 
            filename: saved, 
            imageUrl: "http://localhost:" + serverPort.toString() + "/api/images/" + saved 
        };
    }

    resource function get home(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return createErrorResponse("unauthorized", "Authentication required");
        }

        int totalReports = 0;
        int activeAlerts = 0;
        int resolvedHazards = 0;
        int communityMembers = 0;

        postgresql:Client dbClient = database:getDbClient();

        stream<record {int community_members;}, sql:Error?> usersStream = dbClient->query(`SELECT COUNT(*) AS community_members FROM users`);
        record {| record {int community_members;} value; |}|sql:Error? usersRow = usersStream.next();
        if usersRow is record {| record {int community_members;} value; |} {
            communityMembers = usersRow.value.community_members;
        }
        error? _closeUsers = usersStream.close();
        if _closeUsers is error { 
            log:printError("Failed closing usersStream", _closeUsers); 
        }

        stream<record {int total_reports; int resolved_count; int active_count;}, sql:Error?> reportsStream = dbClient->query(`
            SELECT COUNT(*) AS total_reports,
                   COALESCE(SUM(CASE WHEN LOWER(status) IN ('resolved','closed') THEN 1 ELSE 0 END),0) AS resolved_count,
                   COALESCE(SUM(CASE WHEN LOWER(status) NOT IN ('resolved','closed') THEN 1 ELSE 0 END),0) AS active_count
            FROM hazard_reports
        `);
        record {| record {int total_reports; int resolved_count; int active_count;} value; |}|sql:Error? reportsRow = reportsStream.next();
        if reportsRow is record {| record {int total_reports; int resolved_count; int active_count;} value; |} {
            totalReports = reportsRow.value.total_reports;
            resolvedHazards = reportsRow.value.resolved_count;
            activeAlerts = reportsRow.value.active_count;
        }
        error? _closeReports = reportsStream.close();
        if _closeReports is error { 
            log:printError("Failed closing reportsStream", _closeReports); 
        }

        return {
            success: true,
            message: "Dashboard statistics retrieved",
            user: email,
            timestamp: getCurrentTimestamp(),
            totalReports: totalReports,
            activeAlerts: activeAlerts,
            resolvedHazards: resolvedHazards,
            communityMembers: communityMembers
        };
    }

    // ============ PASSWORD RECOVERY ENDPOINTS ============
    
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
    
    resource function post auth/send\-email\-verification(user:SendVerificationRequest req) returns json {
        user:SendVerificationResponse|error result = auth:sendVerificationOtp(req);
        if result is error {
            log:printError("Send verification OTP failed", result);
            return {
                success: false,
                message: "Failed to send verification code",
                errorCode: "verification_send_failed"
            };
        }
        return {
            success: result.success,
            message: result.message,
            errorCode: result?.errorCode
        };
    }

    resource function post auth/verify\-email(user:VerifyEmailOtpRequest req) returns json {
        user:VerifyEmailOtpResponse|error result = auth:verifyEmailAndCreateAccount(req);
        if result is error {
            log:printError("Email verification failed", result);
            return {
                success: false,
                message: "Failed to verify email",
                errorCode: "email_verification_failed"
            };
        }
        return {
            success: result.success,
            message: result.message,
            token: result?.token,
            errorCode: result?.errorCode
        };
    }

    // ============ HAZARD REPORT ENDPOINTS ============
    
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

        anydata[]|error reportsResult = database:getReportsByUserId(profile.id);
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

        anydata[]|error reportsResult = database:getNearbyReports(
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

    resource function get reports/traffic\-alerts(http:Request req) returns json {
        log:printInfo("BACKEND: Traffic alerts endpoint called");
        
        string|error email = validateAuthHeader(req);
        if email is error {
            log:printError("BACKEND: Auth validation failed for traffic alerts: " + email.message());
            return createErrorResponse("unauthorized", "Authentication required");
        }

        user:UserProfile|error profile = auth:getUserProfile(email);
        if profile is error {
            log:printError("BACKEND: Failed to get user profile for traffic alerts: " + profile.message());
            return createErrorResponse("internal_error", "Failed to retrieve user profile");
        }

        log:printInfo("BACKEND: Fetching traffic alerts for user at: " + profile.locationDetails.latitude.toString() + ", " + profile.locationDetails.longitude.toString());

        var alertsResult = database:getCurrentTrafficAlerts(
            profile.locationDetails.latitude, 
            profile.locationDetails.longitude
        );
        
        if alertsResult is error {
            log:printError("BACKEND: Failed to retrieve traffic alerts: " + alertsResult.message());
            return createErrorResponse("internal_error", "Failed to retrieve current traffic alerts");
        }

        log:printInfo("BACKEND: Successfully retrieved " + alertsResult.length().toString() + " traffic alerts");

        return {
            success: true,
            alerts: <json>alertsResult,
            total_count: alertsResult.length(),
            user_location: {
                latitude: profile.locationDetails.latitude,
                longitude: profile.locationDetails.longitude,
                address: profile.locationDetails.address
            },
            criteria: {
                radius_km: 25,
                time_window_hours: 24
            },
            message: alertsResult.length() > 0 
                ? "Current traffic alerts in your area" 
                : "No current traffic alerts in your area"
        };
    }

    resource function get reports(http:Caller caller, http:Request req) returns error? {
        ReportQueryParams params = extractReportQueryParams(req);
        
        anydata[]|error reportsResult = database:getFilteredHazardReports(
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

    resource function put reports/[int reportId](http:Caller caller, http:Request req) returns error? {
        log:printInfo("BACKEND: PUT reports endpoint called for ID: " + reportId.toString());
        
        string|error email = validateAuthHeader(req);
        if email is error {
            log:printError("BACKEND: Auth validation failed: " + email.message());
            check caller->respond(createErrorResponse("unauthorized", "Authentication required"));
            return;
        }

        user:UserProfile|error profile = auth:getUserProfile(email);
        if profile is error {
            log:printError("BACKEND: Failed to get user profile: " + profile.message());
            check caller->respond(createErrorResponse("internal_error", "Failed to retrieve user profile"));
            return;
        }

        json|error payload = req.getJsonPayload();
        if payload is error {
            log:printError("BACKEND: Invalid JSON payload: " + payload.message());
            check caller->respond(createErrorResponse("invalid_request", "Invalid JSON payload"));
            return;
        }

        // Check if this is a resolve action
        if payload.status is string && payload.status == "resolved" {
            log:printInfo("BACKEND: Processing resolve action for report: " + reportId.toString());
            
            string|error reportType = database:getReportType(reportId);
            if reportType is error {
                log:printError("BACKEND: Failed to get report type: " + reportType.message());
                check caller->respond(createErrorResponse("report_not_found", "Report not found"));
                return;
            }
            
            if reportType != "pothole" && reportType != "construction" {
                log:printError("BACKEND: Attempt to resolve non-road report: " + reportType);
                check caller->respond(createErrorResponse("invalid_operation", "Only pothole and construction reports can be manually resolved"));
                return;
            }

            if profile.userRole != "rda" {
                log:printError("BACKEND: Non-RDA user attempting to resolve report");
                check caller->respond(createErrorResponse("forbidden", "Only RDA officers can resolve reports"));
                return;
            }
            
            boolean|error result = database:resolveHazardReport(reportId, profile.id);
            if result is error {
                log:printError("BACKEND: Resolve failed: " + result.message());
                check caller->respond(createErrorResponse("resolve_failed", result.message()));
            } else {
                log:printInfo("BACKEND: Report resolved successfully: " + reportId.toString());
                check caller->respond({
                    "success": true,
                    "message": "Report resolved and moved to resolved reports",
                    "timestamp": getCurrentTimestamp()
                });
            }
        } else {
            log:printInfo("BACKEND: Processing normal update for report: " + reportId.toString());
            check reports:handleUpdateReport(caller, req, reportId);
        }
    }

    resource function delete reports/[int reportId](http:Caller caller, http:Request req) returns error? {
        log:printInfo("BACKEND: DELETE reports endpoint called for ID: " + reportId.toString());
        
        string|error email = validateAuthHeader(req);
        if email is error {
            log:printError("BACKEND: Auth validation failed: " + email.message());
            check caller->respond(createErrorResponse("unauthorized", "Authentication required"));
            return;
        }

        user:UserProfile|error profile = auth:getUserProfile(email);
        if profile is error {
            log:printError("BACKEND: Failed to get user profile: " + profile.message());
            check caller->respond(createErrorResponse("internal_error", "Failed to retrieve user profile"));
            return;
        }

        var reportDetails = database:getReportDetails(reportId);
        if reportDetails is error {
            check caller->respond(createErrorResponse("report_not_found", "Report not found"));
            return;
        }

        if reportDetails.hazard_type == "pothole" || reportDetails.hazard_type == "construction" {
            if profile.userRole != "rda" && profile.id != reportDetails.user_id {
                check caller->respond(createErrorResponse("forbidden", "You can only delete your own reports or be an RDA officer"));
                return;
            }
        } else {
            check caller->respond(createErrorResponse("invalid_operation", "Traffic and accident reports are automatically deleted after 24 hours"));
            return;
        }

        check reports:handleDeleteReport(caller, req, reportId);
    }

    resource function get resolved\-reports(http:Request req) returns json {
        log:printInfo("BACKEND: GET resolved-reports endpoint called");
        
        string|error email = validateAuthHeader(req);
        if email is error {
            log:printError("BACKEND: Auth validation failed for resolved reports: " + email.message());
            return createErrorResponse("unauthorized", "Authentication required");
        }
        
        var resolvedReports = database:getResolvedReports();
        if resolvedReports is error {
            log:printError("BACKEND: Failed to retrieve resolved reports: " + resolvedReports.message());
            return createErrorResponse("internal_error", "Failed to retrieve resolved reports");
        }

        log:printInfo("BACKEND: Successfully retrieved resolved reports count: " + resolvedReports.length().toString());
        return {
            success: true,
            reports: <json>resolvedReports,
            total_count: resolvedReports.length()
        };
    }

    // ============ COMMENT ENDPOINTS ============
    
    resource function get reports/[int reportId]/comments(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return createErrorResponse("unauthorized", "Authentication required");
        }

        var commentsResult = database:getReportComments(reportId);
        if commentsResult is error {
            return createErrorResponse("internal_error", "Failed to retrieve comments");
        }

        return {
            success: true,
            comments: <json>commentsResult,
            total_count: commentsResult.length(),
            report_id: reportId
        };
    }

    resource function post reports/[int reportId]/comments(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return createErrorResponse("unauthorized", "Authentication required");
        }

        user:UserProfile|error profile = auth:getUserProfile(email);
        if profile is error {
            return createErrorResponse("internal_error", "Failed to retrieve user profile");
        }

        json|error payload = req.getJsonPayload();
        if payload is error {
            return createErrorResponse("invalid_request", "Invalid JSON payload");
        }

        json|error commentTextResult = payload.comment_text;
        if commentTextResult is error {
            return createErrorResponse("invalid_request", "Invalid comment_text field");
        }
        
        json commentTextJson = commentTextResult;
        if commentTextJson is () {
            return createErrorResponse("invalid_request", "Comment text is required");
        }
        
        if commentTextJson !is string {
            return createErrorResponse("invalid_request", "Comment text must be a string");
        }

        string commentText = commentTextJson;
        if commentText.trim().length() == 0 {
            return createErrorResponse("invalid_request", "Comment text cannot be empty");
        }

        if commentText.length() > 500 {
            return createErrorResponse("invalid_request", "Comment text too long (max 500 characters)");
        }

        var commentResult = database:addReportComment(reportId, profile.id, commentText.trim());
        if commentResult is error {
            return createErrorResponse("internal_error", "Failed to add comment");
        }

        return {
            success: true,
            message: "Comment added successfully",
            comment: <json>commentResult
        };
    }

    resource function delete comments/[int commentId](http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return createErrorResponse("unauthorized", "Authentication required");
        }

        user:UserProfile|error profile = auth:getUserProfile(email);
        if profile is error {
            return createErrorResponse("internal_error", "Failed to retrieve user profile");
        }

        boolean|error deleteResult = database:deleteComment(commentId, profile.id);
        if deleteResult is error {
            return createErrorResponse("delete_failed", deleteResult.message());
        }

        return {
            success: true,
            message: "Comment deleted successfully"
        };
    }

    // ============ LIKE/UNLIKE ENDPOINTS ============
    
    resource function get reports/[int reportId]/like(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        int? userId = ();
        
        if email is string {
            user:UserProfile|error profile = auth:getUserProfile(email);
            if profile is user:UserProfile {
                userId = profile.id;
            }
        }

        var likeStats = database:getReportLikeStats(reportId, userId);
        if likeStats is error {
            return createErrorResponse("internal_error", "Failed to retrieve like statistics");
        }

        return {
            success: true,
            report_id: reportId,
            total_likes: likeStats.total_likes,
            total_unlikes: likeStats.total_unlikes,
            user_liked: likeStats.user_liked,
            user_unliked: likeStats.user_unliked
        };
    }

    resource function post reports/[int reportId]/like(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return createErrorResponse("unauthorized", "Authentication required");
        }

        user:UserProfile|error profile = auth:getUserProfile(email);
        if profile is error {
            return createErrorResponse("internal_error", "Failed to retrieve user profile");
        }

        json|error payload = req.getJsonPayload();
        if payload is error {
            return createErrorResponse("invalid_request", "Invalid JSON payload");
        }

        json|error isLikeResult = payload.is_like;
        if isLikeResult is error {
            return createErrorResponse("invalid_request", "Invalid is_like field");
        }
        
        json isLikeJson = isLikeResult;
        if isLikeJson !is boolean {
            return createErrorResponse("invalid_request", "is_like must be a boolean");
        }

        boolean isLike = isLikeJson;

        var likeResult = database:toggleReportLike(reportId, profile.id, isLike);
        if likeResult is error {
            return createErrorResponse("internal_error", "Failed to toggle like");
        }

        return {
            success: true,
            message: isLike ? "Report liked successfully" : "Report unliked successfully",
            data: <json>likeResult
        };
    }

    // ============ RDA ENDPOINTS ============
    
    resource function get rda/reports(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return createErrorResponse("unauthorized", "Authentication required");
        }

        user:UserProfile|error profile = auth:getUserProfile(email);
        if profile is error {
            return createErrorResponse("internal_error", "Failed to retrieve user profile");
        }

        if profile.userRole != "rda" {
            return createErrorResponse("forbidden", "Access denied - RDA role required");
        }

        var reportsResult = database:getAllReports();
        if reportsResult is error {
            return createErrorResponse("internal_error", "Failed to retrieve reports");
        }

        return {
            success: true,
            reports: <json>reportsResult,
            total_count: reportsResult.length()
        };
    }

    resource function get rda/resolved\-reports(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return createErrorResponse("unauthorized", "Authentication required");
        }

        user:UserProfile|error profile = auth:getUserProfile(email);
        if profile is error {
            return createErrorResponse("internal_error", "Failed to retrieve user profile");
        }

        if profile.userRole != "rda" {
            return createErrorResponse("forbidden", "Access denied - RDA role required");
        }

        var resolvedReports = database:getResolvedReports();
        if resolvedReports is error {
            return createErrorResponse("internal_error", "Failed to retrieve resolved reports");
        }

        return {
            success: true,
            reports: <json>resolvedReports,
            total_count: resolvedReports.length()
        };
    }

    resource function put rda/reports/[int reportId]/status(http:Request req) returns json {
        string|error email = validateAuthHeader(req);
        if email is error {
            return createErrorResponse("unauthorized", "Authentication required");
        }

        user:UserProfile|error profile = auth:getUserProfile(email);
        if profile is error {
            return createErrorResponse("internal_error", "Failed to retrieve user profile");
        }

        if profile.userRole != "rda" {
            return createErrorResponse("forbidden", "Access denied - RDA role required");
        }

        json|error payload = req.getJsonPayload();
        if payload is error {
            return createErrorResponse("invalid_request", "Invalid JSON payload");
        }

        if payload.status is string && payload.status == "resolved" {
            string|error reportType = database:getReportType(reportId);
            if reportType is error {
                return createErrorResponse("report_not_found", "Report not found");
            }
            
            if reportType != "pothole" && reportType != "construction" {
                return createErrorResponse("invalid_operation", "Only pothole and construction reports can be manually resolved");
            }
            
            boolean|error result = database:resolveHazardReport(reportId, profile.id);
            if result is error {
                return createErrorResponse("resolve_failed", result.message());
            } else {
                return {
                    "success": true,
                    "message": "Report resolved and moved to resolved reports",
                    "timestamp": getCurrentTimestamp()
                };
            }
        }

        return createErrorResponse("invalid_request", "Unsupported status");
    }

    resource function get images/[string filename](http:Caller caller, http:Request req) returns error? {
        check serveImage(caller, filename);
    }

    // ============ OPTIONS HANDLERS ============
    
    resource function options reports/[int reportId](http:Caller caller, http:Request req) returns error? {
        check respondWithCorsHeaders(caller);
    }

    resource function options reports/[int reportId]/comments(http:Caller caller, http:Request req) returns error? {
        check respondWithCorsHeaders(caller);
    }

    resource function options comments/[int commentId](http:Caller caller, http:Request req) returns error? {
        check respondWithCorsHeaders(caller);
    }

    resource function options reports/[int reportId]/like(http:Caller caller, http:Request req) returns error? {
        check respondWithCorsHeaders(caller);
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
        
        anydata[]|error reportsResult = database:getFilteredHazardReports(
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
    // Initialize database FIRST
    check database:initializeDatabase();
    log:printInfo("Database initialized successfully");
    
    // THEN initialize cleanup task after database is ready
    check reports:initializeCleanupTask();
    
    log:printInfo("SafeRoute API server started on port " + serverPort.toString());
}

// ============ HELPER TYPES AND FUNCTIONS ============

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
        return error AuthError("Authorization header not found");
    }

    if !authHeader.startsWith("Bearer ") {
        return error AuthError("Invalid authorization header format");
    }

    string token = authHeader.substring(7);
    log:printInfo("MAIN: Extracted token, calling auth module validation");
    
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
        location: profile.locationDetails.address,
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