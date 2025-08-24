import ballerina/jwt;
import ballerina/crypto;
import ballerina/time;
import ballerina/sql;
import ballerina/random;
import ballerina/log;
import ballerina/email;

import backend.database;
import backend.user;

configurable string jwtSecret = ?;
configurable string jwtIssuer = ?;
configurable string jwtAudience = ?;
configurable int jwtExpiry = ?;
configurable string smtpHost = ?;
configurable int smtpPort = ?;
configurable string smtpUsername = ?;
configurable string smtpPassword = ?;
configurable boolean emailEnabled = ?;

// Email function for OTP
function sendOtpEmail(string recipientEmail, string otp) returns error? {
    log:printInfo(string `📧 Password reset requested for: ${recipientEmail}`);
    
    if emailEnabled {
        log:printInfo(string `🚀 Sending email via SMTP to: ${recipientEmail}`);
        log:printInfo(string `🔧 SMTP Config: ${smtpHost}:${smtpPort.toString()}`);
        log:printInfo(string `👤 SMTP User: ${smtpUsername}`);
        
        // Create SMTP configuration
        email:SmtpConfiguration smtpConfig = {
            port: smtpPort,
            security: email:START_TLS_AUTO
        };
        
        // Create email client
        email:SmtpClient smtpClient = check new (smtpHost, smtpUsername, smtpPassword, smtpConfig);
        
        // Create email message
        email:Message emailMessage = {
            'from: smtpUsername,
            to: [recipientEmail],
            subject: "SafeRoute - Password Reset OTP",
            body: generateEmailTemplate(otp, recipientEmail),
            contentType: "text/html"
        };
        
        // Send email
        check smtpClient->sendMessage(emailMessage);
        
        log:printInfo("✅ Email sent successfully via SMTP");
        return ();
    } else {
        // Development mode: Log the OTP for testing
        string separator = "============================================================";
        log:printInfo(separator);
        log:printInfo("🔔 EMAIL SERVICE - DEVELOPMENT MODE");
        log:printInfo(separator);
        log:printInfo(string `📧 To: ${recipientEmail}`);
        log:printInfo(string `📋 Subject: SafeRoute - Password Reset OTP`);
        log:printInfo(string `🔐 OTP Code: ${otp}`);
        log:printInfo(string `⏰ Valid for: 10 minutes`);
        log:printInfo(separator);
        log:printInfo("💡 To enable actual email sending:");
        log:printInfo("   1. Set emailEnabled=true in Config.toml");
        log:printInfo("   2. Ensure Gmail App Password is correctly set");
        log:printInfo(separator);
        return ();
    }
}

function generateEmailTemplate(string otp, string recipientEmail) returns string {
    string htmlTemplate = string `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeRoute Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">SafeRoute</h1>
            <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 16px;">Password Reset Request</p>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password</h2>
            <p style="color: #4b5563; font-size: 16px; margin: 0 0 30px 0;">
                We received a request to reset your password. Please use the following verification code:
            </p>
            <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0;">Verification Code</p>
                <div style="color: #1e293b; font-size: 36px; font-weight: 700; letter-spacing: 6px;">${otp}</div>
            </div>
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0;">
                <p style="color: #92400e; font-size: 14px; margin: 0;">
                    This code expires in 10 minutes
                </p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin: 20px 0 0 0;">
                If you didn't request this password reset, please ignore this email.
            </p>
        </div>
        <div style="background-color: #f8fafc; padding: 20px 30px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                © 2025 SafeRoute. This email was sent to ${recipientEmail}
            </p>
        </div>
    </div>
</body>
</html>`;
    
    return htmlTemplate;
}

// JWT and authentication functions
public function register(user:RegisterRequest req) returns user:AuthResponse|error {
    // RDA registration logic
    string role = req.userRole;
    if req.email == "rdasrilanka@gmail.com" {
        if req.password != "Rdasrilanka1" {
            return error("Invalid RDA credentials");
        }
        role = "rda";
    }
    // Validate email format
    if !isValidEmail(req.email) {
        return error("Invalid email format");
    }
    // Validate password strength
    if req.password.length() < 3 {
        return error("Password must be at least 3 characters long");
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

    if req.locationDetails.address.trim().length() == 0 {
        return error("Address is required");
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
    decimal latitude = req.locationDetails.latitude;
    decimal longitude = req.locationDetails.longitude;
    string address = req.locationDetails.address;

    // Insert user into database with location data
    sql:ExecutionResult result = check dbClient->execute(`
        INSERT INTO users (first_name, last_name, email, password_hash, latitude, longitude, address,user_role) 
        VALUES (${req.firstName}, ${req.lastName}, ${req.email}, ${passwordHash}, ${latitude}, ${longitude}, ${address},${role})
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
    // RDA login logic
    if req.email == "rdasrilanka@gmail.com" && req.password == "Rdasrilanka1" {
        user:AuthResponse tokenData = check generateJwt(req.email);
        tokenData.message = "Login successful (RDA)";
        return tokenData;
    }
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
        decimal? latitude;
        decimal? longitude;
        string? address;
        string? profile_image;
        string? user_role;
        string? created_at;
    }, sql:Error?> userStream =
        dbClient->query(`
            SELECT id, first_name, last_name, email, latitude, longitude, address, profile_image, user_role,created_at 
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
    if (userRecord.value.latitude is () || 
        userRecord.value.longitude is () || 
        userRecord.value.address is ()) {
        return error("User location data is incomplete");
    }

    user:LocationDetails locationDetails = {
        latitude: <decimal>userRecord.value.latitude,
        longitude: <decimal>userRecord.value.longitude,
        address: <string>userRecord.value.address
    };

    user:UserProfile profile = {
        id: userRecord.value.id,
        firstName: userRecord.value.first_name,
        lastName: userRecord.value.last_name,
        email: userRecord.value.email,
        locationDetails: locationDetails,
        userRole: userRecord.value["user_role"] ?: "user",
        profileImage: userRecord.value.profile_image is string ? userRecord.value.profile_image : (),
        createdAt: userRecord.value.created_at is string ? userRecord.value.created_at : ()
        createdAt: userRecord.value.created_at
    };
    return profile;
}

public function updateUserProfile(string email, user:UpdateProfileRequest req) returns user:UserProfile|error {
    // Validate input
    if req.firstName.trim().length() == 0 {
        return error("First name is required");
    }
    if req.lastName.trim().length() == 0 {
        return error("Last name is required");
    }
    if req.locationDetails.address.trim().length() == 0 {
        return error("Address is required");
    }

    // Get database client
    var dbClient = database:getDbClient();

    // Update user profile
    sql:ExecutionResult result;
    string? profileImage = req?.profileImage;
    if profileImage is string {
        // Update with profile image
        result = check dbClient->execute(`
            UPDATE users 
            SET first_name = ${req.firstName}, 
                last_name = ${req.lastName}, 
                latitude = ${req.locationDetails.latitude},
                longitude = ${req.locationDetails.longitude},
                address = ${req.locationDetails.address},
                profile_image = ${profileImage}
            WHERE email = ${email}
        `);
    } else {
        // Update without profile image
        result = check dbClient->execute(`
            UPDATE users 
            SET first_name = ${req.firstName}, 
                last_name = ${req.lastName}, 
                latitude = ${req.locationDetails.latitude},
                longitude = ${req.locationDetails.longitude},
                address = ${req.locationDetails.address}
            WHERE email = ${email}
        `);
    }

    if result.affectedRowCount < 1 {
        return error("User not found or no changes made");
    }

    // Return updated profile
    return getUserProfile(email);
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

// Password Recovery Functions

public function requestPasswordReset(user:ForgotPasswordRequest req) returns user:ForgotPasswordResponse|error {
    // Validate email format
    if !isValidEmail(req.email) {
        return {
            success: false,
            message: "Invalid email format",
            errorCode: "invalid_email"
        };
    }

    // Check if user exists
    boolean userExists = check checkUserExists(req.email);
    if !userExists {
        // Don't reveal if user exists or not for security
        return {
            success: true,
            message: "If the email is registered, you will receive an OTP shortly"
        };
    }

    // Generate 6-digit OTP
    string otp = generateOtp();
    
    // Store OTP in database with expiration (10 minutes)
    int expirationTime = <int>time:utcNow()[0] + 600; // 10 minutes from now
    
    var dbClient = database:getDbClient();
    sql:ExecutionResult _ = check dbClient->execute(`
        INSERT INTO password_reset_otps (email, otp, expiration_time, is_used) 
        VALUES (${req.email}, ${otp}, ${expirationTime}, false)
        ON CONFLICT (email) 
        DO UPDATE SET otp = EXCLUDED.otp, expiration_time = EXCLUDED.expiration_time, is_used = false
    `);

    // Send OTP email
    error? emailResult = sendOtpEmail(req.email, otp);
    if emailResult is error {
        return error("Failed to send OTP email: " + emailResult.message());
    }

    return {
        success: true,
        message: "OTP sent to your email address"
    };
}

public function verifyOtp(user:VerifyOtpRequest req) returns user:VerifyOtpResponse|error {
    // Validate email format
    if !isValidEmail(req.email) {
        return {
            success: false,
            message: "Invalid email format",
            errorCode: "invalid_email"
        };
    }

    // Validate OTP format (should be 6 digits)
    if req.otp.length() != 6 {
        return {
            success: false,
            message: "Invalid OTP format",
            errorCode: "invalid_otp"
        };
    }

    int currentTime = <int>time:utcNow()[0];
    
    // Check OTP from database
    var dbClient = database:getDbClient();
    stream<record {|string otp; int expiration_time; boolean is_used;|}, sql:Error?> otpStream = 
        dbClient->query(`
            SELECT otp, expiration_time, is_used 
            FROM password_reset_otps 
            WHERE email = ${req.email}
        `);

    record {|record {|string otp; int expiration_time; boolean is_used;|} value;|}|sql:Error? otpResult = otpStream.next();
    check otpStream.close();

    if otpResult is sql:Error {
        return {
            success: false,
            message: "Database error occurred",
            errorCode: "database_error"
        };
    }

    if otpResult is () {
        return {
            success: false,
            message: "No OTP found for this email",
            errorCode: "otp_not_found"
        };
    }

    record {|string otp; int expiration_time; boolean is_used;|} otpRecord = otpResult.value;

    // Check if OTP is expired
    if currentTime > otpRecord.expiration_time {
        return {
            success: false,
            message: "OTP has expired. Please request a new one",
            errorCode: "otp_expired"
        };
    }

    // Check if OTP is already used
    if otpRecord.is_used {
        return {
            success: false,
            message: "OTP has already been used",
            errorCode: "otp_used"
        };
    }

    // Check if OTP matches
    if otpRecord.otp != req.otp {
        return {
            success: false,
            message: "Invalid OTP",
            errorCode: "invalid_otp"
        };
    }

    // Generate reset token
    string resetToken = generateResetToken(req.email);
    
    // Mark OTP as used
    var dbClient2 = database:getDbClient();
    sql:ExecutionResult _ = check dbClient2->execute(`
        UPDATE password_reset_otps 
        SET is_used = true 
        WHERE email = ${req.email}
    `);

    return {
        success: true,
        message: "OTP verified successfully",
        resetToken: resetToken
    };
}

public function resetPassword(user:ResetPasswordRequest req) returns user:ResetPasswordResponse|error {
    // For simplified implementation, we'll use the reset token as email:timestamp format
    // In production, implement proper JWT validation
    string[] tokenParts = splitString(req.resetToken, ":");
    if tokenParts.length() < 2 {
        return {
            success: false,
            message: "Invalid reset token format",
            errorCode: "invalid_token"
        };
    }
    
    string email = tokenParts[0];
    int|error timestamp = 'int:fromString(tokenParts[1]);
    
    if timestamp is error {
        return {
            success: false,
            message: "Invalid reset token",
            errorCode: "invalid_token"
        };
    }
    
    // Check if token is not expired (15 minutes = 900 seconds)
    time:Utc currentTime = time:utcNow();
    int currentTimeInt = <int>currentTime[0];
    if currentTimeInt - timestamp > 900 {
        return {
            success: false,
            message: "Reset token has expired",
            errorCode: "token_expired"
        };
    }

    // Validate password
    if req.newPassword.length() < 6 {
        return {
            success: false,
            message: "Password must be at least 6 characters long",
            errorCode: "weak_password"
        };
    }

    // Check if passwords match
    if req.newPassword != req.confirmPassword {
        return {
            success: false,
            message: "Passwords do not match",
            errorCode: "password_mismatch"
        };
    }

    // Hash the new password using the same method as registration
    string salt = generateSalt();
    string saltedPassword = req.newPassword + salt;
    byte[] hashedBytes = crypto:hashSha256(saltedPassword.toBytes());
    string hashedPassword = hashedBytes.toBase64() + ":" + salt;

    // Update password in database
    var dbClient3 = database:getDbClient();
    sql:ExecutionResult result = check dbClient3->execute(`
        UPDATE users 
        SET password_hash = ${hashedPassword}
        WHERE email = ${email}
    `);

    if result.affectedRowCount < 1 {
        return {
            success: false,
            message: "Failed to update password",
            errorCode: "update_failed"
        };
    }

    // Clean up used OTP records for this email
    var dbClient4 = database:getDbClient();
    sql:ExecutionResult _ = check dbClient4->execute(`
        DELETE FROM password_reset_otps 
        WHERE email = ${email}
    `);

    return {
        success: true,
        message: "Password reset successfully"
    };
}

function generateOtp() returns string {
    // Generate a 6-digit OTP
    int|error otp = random:createIntInRange(100000, 999999);
    if otp is error {
        // Fallback to manual generation
        return "123456"; // For testing purposes, use a fixed OTP
    }
    return otp.toString();
}

function generateResetToken(string email) returns string {
    // Create a simple token for password reset (valid for 15 minutes)
    time:Utc currentTime = time:utcNow();
    int currentTimeInt = <int>currentTime[0];
    
    // Return email:timestamp format for simple validation
    return email + ":" + currentTimeInt.toString();
}

function validateResetToken(string token) returns string|error {
    // Split token to get email and timestamp
    string[] parts = splitString(token, ":");
    if parts.length() < 2 {
        return error("Invalid token format");
    }
    
    int|error timestamp = 'int:fromString(parts[1]);
    
    if timestamp is error {
        return error("Invalid timestamp in token");
    }
    
    // Check if token is not expired (15 minutes = 900 seconds)
    time:Utc currentTime = time:utcNow();
    int currentTimeInt = <int>currentTime[0];
    if currentTimeInt - timestamp > 900 {
        return error("Token has expired");
    }
    
    // For now, we'll extract email from token by checking database
    // This is a simplified approach - in production, you'd store the email in the token
    // or use a proper JWT library
    return error("Token validation not fully implemented - use OTP verification for now");
}
