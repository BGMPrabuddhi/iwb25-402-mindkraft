import ballerina/jwt;
import ballerina/time;
import ballerina/log;
import backend.user as userModule;

# Represents JWT configuration details
# + secret - Secret key for JWT signing
# + issuer - JWT issuer
# + audience - JWT audience
# + expiry - Token expiry time in seconds
public type JWTConfig record {
    string secret;
    string issuer;
    string audience;
    int expiry;
};

# Represents JWT custom claims
# + userId - Unique identifier of the user
# + email - Email address of the user
# + firstName - First name of the user
# + lastName - Last name of the user
public type CustomClaims record {
    int userId;
    string email;
    string firstName;
    string lastName;
};

# Represents JWT authentication response
# + accessToken - Generated JWT token
# + tokenType - Type of the token (Bearer)
# + expiresIn - Token expiration time in seconds
# + user - User information
public type JWTResponse record {
    string accessToken;
    string tokenType = "Bearer";
    int expiresIn;
    userModule:UserResponse user;
};

# Global JWT configuration instance
JWTConfig? jwtConfig = ();

# Initializes JWT configuration
# + config - JWT configuration details
public function initJWT(JWTConfig config) {
    jwtConfig = config;
    log:printInfo("JWT configuration initialized");
}

# Generate JWT token for user
public function generateToken(userModule:UserResponse user) returns string|error {
    if jwtConfig is () {
        return error("JWT configuration not initialized");
    }
    
    JWTConfig config = <JWTConfig>jwtConfig;
    
    // Current time and expiry
    time:Utc currentTime = time:utcNow();
    time:Civil currentCivil = time:utcToCivil(currentTime);
    decimal currentEpoch = <decimal>currentCivil.hour * 3600 + 
                          <decimal>currentCivil.minute * 60 +
                          <decimal>currentCivil.second;
    decimal expirySeconds = currentEpoch + <decimal>config.expiry;
    
    // Generate token
    string|jwt:Error token = jwt:issue({
        issuer: config.issuer,
        username: user.email,
        audience: [config.audience],
        expTime: expirySeconds,
        customClaims: {
            "userId": user.id,
            "email": user.email,
            "firstName": user.firstName,
            "lastName": user.lastName
        }
    });
    
    if token is string {
        return token;
    } else {
        log:printError("Failed to generate JWT token", token);
        return error("Failed to generate token");
    }
}

# Verify JWT token
public function verifyToken(string token) returns jwt:Payload|error {
    if jwtConfig is () {
        return error("JWT configuration not initialized");
    }
    
    JWTConfig config = <JWTConfig>jwtConfig;
    
    jwt:ValidatorConfig validatorConfig = {
        issuer: config.issuer,
        audience: [config.audience],
        clockSkew: 60, // 1 minute clock skew,
        signatureConfig: {
            certFile: "path/to/public.crt"
        }
    };
    
    jwt:Payload|jwt:Error result = jwt:validate(token, validatorConfig);
    
    if result is jwt:Payload {
        return result;
    } else {
        log:printError("JWT token validation failed", result);
        return error("Invalid token");
    }
}

# Extract user ID from JWT payload
public function extractUserId(jwt:Payload payload) returns int|error {
    map<json>|error claims = <map<json>|error>payload.get("customClaims");
    if claims is map<json> {
        json|error userId = claims["userId"];
        if userId is int {
            return userId;
        }
    }
    return error("User ID not found in token");
}

# For development purposes, use HMAC-based JWT (simpler setup)
# Generate HMAC-based JWT token
public function generateHMACToken(userModule:UserResponse user) returns string|error {
    if jwtConfig is () {
        return error("JWT configuration not initialized");
    }
    
    JWTConfig config = <JWTConfig>jwtConfig;
    
    // Current time and expiry
    time:Utc currentTime = time:utcNow();
    time:Civil currentCivil = time:utcToCivil(currentTime);
    decimal currentEpoch = (<decimal>currentCivil.year * 31556952) + 
                        (<decimal>currentCivil.month * 2629746) +
                        (<decimal>currentCivil.day * 86400);
    decimal expirySeconds = currentEpoch + <decimal>config.expiry;
    
    // Generate HMAC token using simple secret key config
    string|jwt:Error token = jwt:issue({
        issuer: config.issuer,
        username: user.email,
        audience: [config.audience],
        expTime: expirySeconds,
        signatureConfig: {
            config: config.secret
        },
        customClaims: {
            "userId": user.id,
            "email": user.email,
            "firstName": user.firstName,
            "lastName": user.lastName
        }
    });
    
    if token is string {
        return token;
    } else {
        log:printError("Failed to generate HMAC JWT token", token);
        return error("Failed to generate token");
    }
}

# Verify HMAC-based JWT token
public function verifyHMACToken(string token) returns jwt:Payload|error {
    if jwtConfig is () {
        return error("JWT configuration not initialized");
    }
    
    JWTConfig config = <JWTConfig>jwtConfig;
    
    jwt:ValidatorConfig validatorConfig = {
        issuer: config.issuer,
        audience: [config.audience],
        clockSkew: 60, // 1 minute clock skew,
        signatureConfig: {
            certFile: "path/to/public.crt"
        }
    };
    
    jwt:Payload|jwt:Error result = jwt:validate(token, validatorConfig);
    
    if result is jwt:Payload {
        return result;
    } else {
        log:printError("HMAC JWT token validation failed", result);
        return error("Invalid token");
    }
}