import ballerina/http;
import ballerina/log;
import ballerina/toml;
import ballerina/jwt;
import ballerina/time;
import backend.database as db;
import backend.auth as authModule;
import backend.user as userModule;

service /api on new http:Listener(8080) {
    
    resource function get health() returns json|error {
        error? testResult = testConnection();
        if testResult is error {
            log:printError("Database connection failed", testResult);
            return {"status": "error", "message": "Database connection failed"};
        }
        return {"status": "ok", "message": "Database connected successfully"};
    }
}

# HTTP listener configuration
listener http:Listener httpListener = new(8080);

# Service for user authentication
service /api on httpListener {
    
    # Health check endpoint
    resource function get health() returns json {
        return {
            "status": "OK",
            "service": "SafeRoute Auth Service",
            "timestamp": time:utcNow()
        };
    }
    
    # User registration endpoint
    resource function post signup(userModule:UserRegistrationRequest request) returns http:Response {
        http:Response response = new;
        
        // Validate request
        if request.firstName.trim() == "" || request.lastName.trim() == "" || 
           request.email.trim() == "" || request.location.trim() == "" || 
           request.password.trim() == "" {
            response.statusCode = 400;
            response.setJsonPayload({
                "error": "All fields are required"
            });
            return response;
        }
        
        // Email validation
        if !isValidEmail(request.email) {
            response.statusCode = 400;
            response.setJsonPayload({
                "error": "Invalid email format"
            });
            return response;
        }
        
        // Password validation
        if request.password.length() < 8 {
            response.statusCode = 400;
            response.setJsonPayload({
                "error": "Password must be at least 8 characters long"
            });
            return response;
        }
        
        // Create user
        userModule:UserResponse|error userResult = userModule:createUser(request);
        
        if userResult is userModule:UserResponse {
            // Generate JWT token
            string|error token = authModule:generateHMACToken(userResult);
            
            if token is string {
                authModule:JWTResponse jwtResponse = {
                    accessToken: token,
                    expiresIn: 3600, // 1 hour
                    user: userResult
                };
                
                response.statusCode = 201;
                response.setJsonPayload(jwtResponse.toJson());
                log:printInfo("User registered successfully: " + userResult.email);
            } else {
                response.statusCode = 500;
                response.setJsonPayload({
                    "error": "Failed to generate authentication token"
                });
                log:printError("Token generation failed", token);
            }
        } else {
            if userResult.message().includes("already exists") {
                response.statusCode = 409;
            } else {
                response.statusCode = 500;
            }
            response.setJsonPayload({
                "error": userResult.message()
            });
            log:printError("User registration failed", userResult);
        }
        
        return response;
    }
    
    # User login endpoint
    resource function post login(userModule:UserLoginRequest request) returns http:Response {
        http:Response response = new;
        
        // Validate request
        if request.email.trim() == "" || request.password.trim() == "" {
            response.statusCode = 400;
            response.setJsonPayload({
                "error": "Email and password are required"
            });
            return response;
        }
        
        // Authenticate user
        userModule:UserResponse|error userResult = userModule:authenticateUser(request);
        
        if userResult is userModule:UserResponse {
            // Generate JWT token
            string|error token = authModule:generateHMACToken(userResult);
            
            if token is string {
                authModule:JWTResponse jwtResponse = {
                    accessToken: token,
                    expiresIn: 3600, // 1 hour
                    user: userResult
                };
                
                response.statusCode = 200;
                response.setJsonPayload(jwtResponse.toJson());
                log:printInfo("User logged in successfully: " + userResult.email);
            } else {
                response.statusCode = 500;
                response.setJsonPayload({
                    "error": "Failed to generate authentication token"
                });
                log:printError("Token generation failed", token);
            }
        } else {
            response.statusCode = 401;
            response.setJsonPayload({
                "error": "Invalid credentials"
            });
            log:printInfo("Login attempt failed for: " + request.email);
        }
        
        return response;
    }
    
    # Protected endpoint - Get user profile
    resource function get profile(@http:Header string authorization) returns http:Response {
        http:Response response = new;
        
        // Extract token from Authorization header
        string|error token = extractTokenFromHeader(authorization);
        
        if token is error {
            response.statusCode = 401;
            response.setJsonPayload({
                "error": "Authorization header missing or invalid"
            });
            return response;
        }
        
        // Verify token
        jwt:Payload|error payload = authModule:verifyHMACToken(token);
        
        if payload is jwt:Payload {
            // Extract user ID from token
            int|error userId = authModule:extractUserId(payload);
            
            if userId is int {
                // Get user details
                userModule:UserResponse|error user = userModule:getUserById(userId);
                
                if user is userModule:UserResponse {
                    response.statusCode = 200;
                    response.setJsonPayload(user.toJson());
                } else {
                    response.statusCode = 404;
                    response.setJsonPayload({
                        "error": "User not found"
                    });
                }
            } else {
                response.statusCode = 401;
                response.setJsonPayload({
                    "error": "Invalid token payload"
                });
            }
        } else {
            response.statusCode = 401;
            response.setJsonPayload({
                "error": "Invalid or expired token"
            });
        }
        
        return response;
    }
    
    # Token validation endpoint
    resource function post validate\-token(@http:Header string authorization) returns http:Response {
        http:Response response = new;
        
        string|error token = extractTokenFromHeader(authorization);
        
        if token is error {
            response.statusCode = 401;
            response.setJsonPayload({
                "valid": false,
                "error": "Authorization header missing or invalid"
            });
            return response;
        }
        
        jwt:Payload|error payload = authModule:verifyHMACToken(token);
        
        if payload is jwt:Payload {
            response.statusCode = 200;
            response.setJsonPayload({
                "valid": true,
                "payload": payload.toJson()
            });
        } else {
            response.statusCode = 401;
            response.setJsonPayload({
                "valid": false,
                "error": "Invalid or expired token"
            });
        }
        
        return response;
    }
}

# Initialize application
# + return - An error if initialization fails, () otherwise
public function main() returns error? {
    // Load configuration
    map<json> config = check toml:readFile("Config.toml");
    
    // Initialize database
    db:DatabaseConfig dbConfig = {
        host: (config["database.host"] ?: "").toString(),
        port: check int:fromString((config["database.port"] ?: "5432").toString()),
        name: (config["database.name"] ?: "").toString(),
        username: (config["database.username"] ?: "").toString(),
        password: (config["database.password"] ?: "").toString()
    };
    
    check db:initDatabase(dbConfig);
    
    // Initialize JWT
    authModule:JWTConfig jwtConfig = {
        secret: (config["jwt.secret"] ?: "").toString(),
        issuer: (config["jwt.issuer"] ?: "").toString(),
        audience: (config["jwt.audience"] ?: "").toString(),
        expiry: check int:fromString((config["jwt.expiry"] ?: "3600").toString())
    };
    
    authModule:initJWT(jwtConfig);
    
    log:printInfo("SafeRoute Auth Service started on port 8080");
}

# Utility function to validate email format
# + email - The email address to validate
# + return - true if email is valid, false otherwise
function isValidEmail(string email) returns boolean {
    // Simple email validation regex
    return email.matches(re `^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`);
}

# Extract JWT token from Authorization header
# + authHeader - The Authorization header value from the request
# + return - The extracted token if successful, error if the header format is invalid
function extractTokenFromHeader(string authHeader) returns string|error {
    if authHeader.startsWith("Bearer ") {
        return authHeader.substring(7);
    }
    return error("Invalid authorization header format");
}