import ballerina/sql;
import ballerina/crypto;
import ballerina/log;
import ballerina/uuid;
import backend.database as db;

# User record type
#
# + id - The unique identifier for the user
# + firstName - User's first name
# + lastName - User's last name
# + email - User's email address
# + location - User's location
# + passwordHash - Hashed password with salt
public type User record {
    int id?;
    string firstName;
    string lastName;
    string email;
    string location;
    string passwordHash;
};

# User registration request record
#
# + firstName - User's first name
# + lastName - User's last name
# + email - User's email address
# + location - User's location
# + password - User's plain text password
public type UserRegistrationRequest record {
    string firstName;
    string lastName;
    string email;
    string location;
    string password;
};

# User login request record
#
# + email - User's email address
# + password - User's password
public type UserLoginRequest record {
    string email;
    string password;
};

# User response record (without sensitive information)
#
# + id - The unique identifier for the user
# + firstName - User's first name
# + lastName - User's last name
# + email - User's email address
# + location - User's location
public type UserResponse record {
    int id;
    string firstName;
    string lastName;
    string email;
    string location;
};

# Hash password using SHA-256 with a unique salt
#
# + password - The plain text password to hash
# + return - A string containing the base64 encoded hash and salt, separated by ":"
function hashPassword(string password) returns string {
    // Add salt for security
    string salt = uuid:createType1AsString();
    string saltedPassword = password + salt;
    
    byte[] hashedBytes = crypto:hashSha256(saltedPassword.toBytes());
    return hashedBytes.toBase64() + ":" + salt;
}

# Verify password against stored hash
#
# + password - The plain text password to verify
# + storedHash - The stored hash and salt combination (format: "hash:salt")
# + return - True if password matches, false otherwise
function verifyPassword(string password, string storedHash) returns boolean {
    int? colonIndex = storedHash.indexOf(":");
    if colonIndex is () {
        return false;
    }
    
    string hash = storedHash.substring(0, colonIndex);
    string salt = storedHash.substring(colonIndex + 1);
    
    string saltedPassword = password + salt;
    byte[] hashedBytes = crypto:hashSha256(saltedPassword.toBytes());
    string computedHash = hashedBytes.toBase64();
    
    return computedHash == hash;
}

# Create a new user in the system
#
# + request - The user registration request containing user details
# + return - UserResponse if successful, error if registration fails
public function createUser(UserRegistrationRequest request) returns UserResponse|error {
    // Check if user already exists
    if check userExistsByEmail(request.email) {
        return error("User with this email already exists");
    }
    
    // Hash password
    string hashedPassword = hashPassword(request.password);
    
    // Get database client
    sql:Client dbClient = check db:getDbClient();
    
    // Insert user and return the created user data
    sql:ParameterizedQuery query = `
        INSERT INTO users (first_name, last_name, email, location, password_hash)
        VALUES (${request.firstName}, ${request.lastName}, ${request.email}, 
                ${request.location}, ${hashedPassword})
        RETURNING id, first_name, last_name, email, location
    `;
    
    stream<record{}, error?> resultStream = dbClient->query(query);
    record{}|error? userRecord = resultStream.next();
    check resultStream.close();
    
    if userRecord is record{} {
        return {
            id: <int>userRecord["id"],
            firstName: <string>userRecord["first_name"],
            lastName: <string>userRecord["last_name"],
            email: <string>userRecord["email"],
            location: <string>userRecord["location"]
        };
    }
    
    log:printError("Failed to create user");
    return error("Failed to create user");
}

# Authenticate user with email and password
#
# + request - The login request containing email and password
# + return - UserResponse if authentication successful, error if credentials are invalid
public function authenticateUser(UserLoginRequest request) returns UserResponse|error {
    sql:Client dbClient = check db:getDbClient();
    
    sql:ParameterizedQuery query = `
        SELECT id, first_name, last_name, email, location, password_hash 
        FROM users WHERE email = ${request.email}
    `;
    
    stream<record{}, error?> resultStream = dbClient->query(query);
    record{}|error? userRecord = resultStream.next();
    check resultStream.close();
    
    if userRecord is record{} {
        string storedHash = <string>userRecord["password_hash"];
        
        if verifyPassword(request.password, storedHash) {
            return {
                id: <int>userRecord["id"],
                firstName: <string>userRecord["first_name"],
                lastName: <string>userRecord["last_name"],
                email: <string>userRecord["email"],
                location: <string>userRecord["location"]
            };
        } else {
            return error("Invalid credentials");
        }
    }
    
    return error("Invalid credentials");
}

# Check if a user exists with the given email address
#
# + email - The email address to check
# + return - true if user exists, false otherwise, or error if query fails
function userExistsByEmail(string email) returns boolean|error {
    sql:Client dbClient = check db:getDbClient();
    
    sql:ParameterizedQuery query = `SELECT COUNT(*) as count FROM users WHERE email = ${email}`;
    
    stream<record{}, error?> resultStream = dbClient->query(query);
    record{}|error? result = resultStream.next();
    check resultStream.close();
    
    if result is record{} {
        int count = <int>result["count"];
        return count > 0;
    }
    
    return false;
}

# Get user information by user ID
#
# + userId - The ID of the user to retrieve
# + return - UserResponse if user found, error if user not found or query fails
public function getUserById(int userId) returns UserResponse|error {
    sql:Client dbClient = check db:getDbClient();
    
    sql:ParameterizedQuery query = `
        SELECT id, first_name, last_name, email, location 
        FROM users WHERE id = ${userId}
    `;
    
    stream<record{}, sql:Error?> resultStream = dbClient->query(query);
    record{}|sql:Error? userRecord = resultStream.next();
    check resultStream.close();
    
    if userRecord is record{} {
        return {
            id: <int>userRecord["id"],
            firstName: <string>userRecord["first_name"],
            lastName: <string>userRecord["last_name"],
            email: <string>userRecord["email"],
            location: <string>userRecord["location"]
        };
    }
    
    return error("User not found");
}