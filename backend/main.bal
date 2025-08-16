import ballerina/http;
import ballerina/log;
import ballerina/time;
import ballerina/sql;
import backend.auth;
import backend.user;
import backend.database;

configurable int serverPort = ?;
configurable string[] corsOrigins = ?;

listener http:Listener apiListener = new (serverPort);

service /api on apiListener {

    // Public endpoints - no authentication required
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

    // Protected endpoints - require authentication
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

    resource function get health() returns json|error {
        var dbClient = database:getDbClient();
        
        // Test database connection by querying a simple value
        stream<record {int value;}, sql:Error?> testStream = dbClient->query(`SELECT 1 as value`);
        var testResult = testStream.next();
        check testStream.close();
        
        if testResult is sql:Error {
            log:printError("Database connection failed", testResult);
            return {"status": "error", "message": "Database connection failed"};
        }
        
        if testResult is () {
            return {"status": "error", "message": "Database connection failed"};
        }
        
        return {"status": "ok", "message": "Database connected successfully"};
    }
}

// Initialize database on startup
public function main() returns error? {
    check database:initializeDatabase();
    log:printInfo("Database initialized successfully");
    log:printInfo("Server started on port 8080");
}

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