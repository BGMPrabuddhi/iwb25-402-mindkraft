import ballerina/jwt;
import ballerina/crypto;
import ballerina/time;
import ballerina/sql;

import backend.database;
import backend.user;

configurable string jwtSecret = ?;
configurable string jwtIssuer = ?;
configurable string jwtAudience = ?;
configurable int jwtExpiry = ?;

public function register(user:RegisterRequest req) returns user:AuthResponse|error {
    // Validate email format
    if !isValidEmail(req.email) {
        return error("Invalid email format");
    }

    // Validate password strength
    if req.password.length() < 6 {
        return error("Password must be at least 6 characters long");
    }

    // Validate location data (now required)
    if req.location.trim().length() == 0 {
        return error("Location is required");
    }

    // Validate location details (now required)
    if req.locationDetails.latitude < -90.0d || req.locationDetails.latitude > 90.0d {
        return error("Invalid latitude value");
    }
    if req.locationDetails.longitude < -180.0d || req.locationDetails.longitude > 180.0d {
        return error("Invalid longitude value");
    }
    if req.locationDetails.city.trim().length() == 0 {
        return error("City is required");
    }
    if req.locationDetails.country.trim().length() == 0 {
        return error("Country is required");
    }

    // Check if user already exists
    boolean userExists = check checkUserExists(req.email);
    if userExists {
        return error("User with this email already exists");
    }

    // Hash the password using SHA-256
    string salt = generateSalt();
    string saltedPassword = req.password + salt;
    byte[] hashedPassword = crypto:hashSha256(saltedPassword.toBytes());
    string passwordHash = hashedPassword.toBase64() + ":" + salt;

    // Get database client
    var dbClient = database:getDbClient();

    // Location data (now required)
    string location = req.location;
    decimal latitude = req.locationDetails.latitude;
    decimal longitude = req.locationDetails.longitude;
    string city = req.locationDetails.city;
    string state = req.locationDetails.state;
    string country = req.locationDetails.country;
    string fullAddress = req.locationDetails.fullAddress;

    // Insert user into database with location data
    sql:ExecutionResult result = check dbClient->execute(`
        INSERT INTO users (first_name, last_name, email, password_hash, location, latitude, longitude, city, state, country, full_address) 
        VALUES (${req.firstName}, ${req.lastName}, ${req.email}, ${passwordHash}, ${location}, ${latitude}, ${longitude}, ${city}, ${state}, ${country}, ${fullAddress})
    `);

    if result.affectedRowCount < 1 {
        return error("Failed to create user");
    }

    // Generate JWT token
    user:AuthResponse tokenData = check generateJwt(req.email);
    tokenData.message = "User registered successfully";
    return tokenData;
}

public function login(user:LoginRequest req) returns user:AuthResponse|error {
    // Get database client
    var dbClient = database:getDbClient();

    // Get user from database
    stream<record {string password_hash;}, sql:Error?> userStream = 
        dbClient->query(`SELECT password_hash FROM users WHERE email = ${req.email}`);

    var userRecord = userStream.next();
    check userStream.close();

    if userRecord is sql:Error {
        return error("Database error occurred");
    }

    if userRecord is () {
        return error("Invalid email or password");
    }

    // Verify password
    string[] parts = splitString(userRecord.value.password_hash, ":");
    if parts.length() != 2 {
        return error("Invalid password format in database");
    }

    string storedHash = parts[0];
    string salt = parts[1];
    
    string saltedPassword = req.password + salt;
    byte[] inputHash = crypto:hashSha256(saltedPassword.toBytes());
    string inputHashBase64 = inputHash.toBase64();

    if storedHash != inputHashBase64 {
        return error("Invalid email or password");
    }

    // Generate JWT token
    user:AuthResponse tokenData = check generateJwt(req.email);
    tokenData.message = "Login successful";
    return tokenData;
}

public function getUserProfile(string email) returns user:UserProfile|error {
    // Get database client
    var dbClient = database:getDbClient();

    stream<record {
        int id; 
        string first_name; 
        string last_name; 
        string email; 
        string? location;
        decimal? latitude;
        decimal? longitude;
        string? city;
        string? state;
        string? country;
        string? full_address;
        string created_at?;
    }, sql:Error?> userStream = 
        dbClient->query(`
            SELECT id, first_name, last_name, email, location, latitude, longitude, city, state, country, full_address, created_at 
            FROM users WHERE email = ${email}
        `);

    var userRecord = userStream.next();
    check userStream.close();

    if userRecord is sql:Error {
        return error("Database error occurred");
    }

    if userRecord is () {
        return error("User not found");
    }

    // Ensure location data is present (now required)
    if (userRecord.value.location is () ||
        userRecord.value.latitude is () || 
        userRecord.value.longitude is () || 
        userRecord.value.city is () || 
        userRecord.value.state is () || 
        userRecord.value.country is () || 
        userRecord.value.full_address is ()) {
        return error("User location data is incomplete");
    }

    user:LocationDetails locationDetails = {
        latitude: <decimal>userRecord.value.latitude,
        longitude: <decimal>userRecord.value.longitude,
        city: <string>userRecord.value.city,
        state: <string>userRecord.value.state,
        country: <string>userRecord.value.country,
        fullAddress: <string>userRecord.value.full_address
    };

    return {
        id: userRecord.value.id,
        firstName: userRecord.value.first_name,
        lastName: userRecord.value.last_name,
        email: userRecord.value.email,
        location: <string>userRecord.value.location,
        locationDetails: locationDetails,
        createdAt: userRecord.value.created_at
    };
}

public function validateJwtToken(string token) returns string|error {
    jwt:ValidatorConfig validatorConfig = {
        issuer: jwtIssuer,
        audience: jwtAudience,
        signatureConfig: {
            secret: jwtSecret
        }
    };

    jwt:Payload payload = check jwt:validate(token, validatorConfig);
    
    string? sub = payload.sub;
    if sub is string {
        return sub;
    }
    
    return error("Invalid token: subject not found");
}

function generateJwt(string email) returns user:AuthResponse|error {
    time:Utc currentTime = time:utcNow();
    
    // Get current time in seconds
    [int, decimal] [timeSeconds, timeFraction] = currentTime;
    decimal currentTimeInSeconds = <decimal>timeSeconds + timeFraction;
    
    jwt:IssuerConfig issuerConfig = {
        issuer: jwtIssuer,
        audience: jwtAudience,
        expTime: currentTimeInSeconds + <decimal>jwtExpiry,
        signatureConfig: {
            algorithm: jwt:HS256,
            config: jwtSecret
        },
        customClaims: {"sub": email}
    };

    string jwtToken = check jwt:issue(issuerConfig);

    return {
        token: jwtToken,
        tokenType: "Bearer",
        expiresIn: jwtExpiry,
        message: ""
    };
}

function checkUserExists(string email) returns boolean|error {
    // Get database client
    var dbClient = database:getDbClient();

    stream<record {int count;}, sql:Error?> countStream = 
        dbClient->query(`SELECT COUNT(*) as count FROM users WHERE email = ${email}`);

    var countRecord = countStream.next();
    check countStream.close();

    if countRecord is sql:Error {
        return error("Database error occurred");
    }

    if countRecord is () {
        return false;
    }

    return countRecord.value.count > 0;
}

function isValidEmail(string email) returns boolean {
    // Simple email validation
    return email.includes("@") && email.includes(".") && email.length() > 5;
}

function generateSalt() returns string {
    // Generate a simple salt using current time
    time:Utc currentTime = time:utcNow();
    [int, decimal] [timeSeconds, timeFraction] = currentTime;
    string timeString = timeSeconds.toString() + timeFraction.toString();
    byte[] saltBytes = crypto:hashSha256(timeString.toBytes());
    return saltBytes.toBase64();
}

function splitString(string input, string delimiter) returns string[] {
    // Simple string split implementation
    string[] parts = [];
    int startIndex = 0;
    int? delimiterIndex = input.indexOf(delimiter, startIndex);
    
    while delimiterIndex is int {
        parts.push(input.substring(startIndex, delimiterIndex));
        startIndex = delimiterIndex + delimiter.length();
        delimiterIndex = input.indexOf(delimiter, startIndex);
    }
    
    // Add the last part
    parts.push(input.substring(startIndex));
    
    return parts;
}
