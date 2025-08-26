import ballerina/log;
import ballerina/time;
import ballerina/sql;
import ballerina/random;
import ballerina/crypto;
import ballerina/email;
import ballerina/jwt;

import backend.database;
import backend.user;

// Note: These configurations will be passed from the calling module
public function storePendingRegistration(user:RegisterRequest req, string otp, string jwtSecret, string smtpHost, int smtpPort, string smtpUsername, string smtpPassword, boolean emailEnabled) returns error? {
    var dbClient = database:getDbClient();
    
    // Hash the password for storage
    string salt = generateSalt();
    string saltedPassword = req.password + salt;
    byte[] hashedPassword = crypto:hashSha256(saltedPassword.toBytes());
    string passwordHash = hashedPassword.toBase64() + ":" + salt;
    
    int expirationTime = <int>time:utcNow()[0] + 600; // 10 minutes
    
    // Store pending user data
    sql:ExecutionResult _ = check dbClient->execute(`
        INSERT INTO pending_user_registrations (
            first_name, last_name, email, password_hash, location, user_role,
            latitude, longitude, address, otp, expiration_time
        ) VALUES (
            ${req.firstName}, ${req.lastName}, ${req.email}, ${passwordHash}, 
            ${req.location}, ${req.userRole}, ${req.locationDetails.latitude}, 
            ${req.locationDetails.longitude}, ${req.locationDetails.address}, 
            ${otp}, ${expirationTime}
        )
        ON CONFLICT (email) 
        DO UPDATE SET 
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            password_hash = EXCLUDED.password_hash,
            location = EXCLUDED.location,
            user_role = EXCLUDED.user_role,
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            address = EXCLUDED.address,
            otp = EXCLUDED.otp,
            expiration_time = EXCLUDED.expiration_time,
            created_at = CURRENT_TIMESTAMP
    `);
    
    log:printInfo("Pending registration stored for: " + req.email);
}

public function verifyOtpAndCreateUser(string email, string inputOtp, string jwtSecret, string jwtIssuer, string jwtAudience, int jwtExpiry) returns user:AuthResponse|error {
    var dbClient = database:getDbClient();
    int currentTime = <int>time:utcNow()[0];
    
    // Get pending registration
    stream<record {|
        string first_name;
        string last_name;
        string email;
        string password_hash;
        string location;
        string user_role;
        decimal latitude;
        decimal longitude;
        string address;
        string otp;
        int expiration_time;
    |}, sql:Error?> pendingStream = dbClient->query(`
        SELECT first_name, last_name, email, password_hash, location, user_role,
               latitude, longitude, address, otp, expiration_time
        FROM pending_user_registrations 
        WHERE email = ${email}
    `);
    
    record {| record {|
        string first_name;
        string last_name;
        string email;
        string password_hash;
        string location;
        string user_role;
        decimal latitude;
        decimal longitude;
        string address;
        string otp;
        int expiration_time;
    |} value; |}|sql:Error? pendingRecord = pendingStream.next();
    
    check pendingStream.close();
    
    if pendingRecord is sql:Error {
        return error("Database error occurred");
    }
    
    if pendingRecord is () {
        return error("No pending registration found for this email");
    }
    
    record {|
        string first_name;
        string last_name;
        string email;
        string password_hash;
        string location;
        string user_role;
        decimal latitude;
        decimal longitude;
        string address;
        string otp;
        int expiration_time;
    |} pending = pendingRecord.value;
    
    // Check if OTP is expired
    if currentTime > pending.expiration_time {
        // Clean up expired pending registration
        sql:ExecutionResult _ = check dbClient->execute(`
            DELETE FROM pending_user_registrations WHERE email = ${email}
        `);
        return error("OTP has expired. Please request a new one");
    }
    
    // Verify OTP
    if pending.otp != inputOtp {
        return error("Invalid OTP. Please try again");
    }
    
    // Create the actual user account
    sql:ExecutionResult result = check dbClient->execute(`
        INSERT INTO users (
            first_name, last_name, email, password_hash, latitude, longitude, 
            address, user_role, is_email_verified
        ) VALUES (
            ${pending.first_name}, ${pending.last_name}, ${pending.email}, 
            ${pending.password_hash}, ${pending.latitude}, ${pending.longitude}, 
            ${pending.address}, ${pending.user_role}, true
        )
    `);
    
    if result.affectedRowCount < 1 {
        return error("Failed to create user account");
    }
    
    // Clean up pending registration
    sql:ExecutionResult _ = check dbClient->execute(`
        DELETE FROM pending_user_registrations WHERE email = ${email}
    `);
    
    log:printInfo("User account created successfully for: " + pending.email);
    
    // Generate JWT token
    user:AuthResponse tokenData = check generateJwt(pending.email, jwtSecret, jwtIssuer, jwtAudience, jwtExpiry);
    
    if pending.user_role == "rda" {
        tokenData.message = "RDA account created and verified successfully";
    } else {
        tokenData.message = "Account created and verified successfully";
    }
    
    return tokenData;
}

public function sendRegistrationOtp(string email, string otp, string smtpHost, int smtpPort, string smtpUsername, string smtpPassword, boolean emailEnabled) returns error? {
    log:printInfo(string `Email verification requested for: ${email}`);
    
    if emailEnabled {
        return sendEmailViaSMTP(email, otp, smtpHost, smtpPort, smtpUsername, smtpPassword);
    } else {
        return logOtpForDevelopment(email, otp);
    }
}

function logOtpForDevelopment(string email, string otp) returns error? {
    string separator = "============================================================";
    log:printInfo(separator);
    log:printInfo("EMAIL VERIFICATION - DEVELOPMENT MODE");
    log:printInfo(separator);
    log:printInfo(string `To: ${email}`);
    log:printInfo(string `Subject: SafeRoute - Verify Your Email`);
    log:printInfo(string `Verification Code: ${otp}`);
    log:printInfo(string `Valid for: 10 minutes`);
    log:printInfo(separator);
    log:printInfo("To enable actual email sending:");
    log:printInfo("1. Set emailEnabled=true in Config.toml");
    log:printInfo("2. Configure SMTP settings correctly");
    log:printInfo(separator);
    return ();
}

function sendEmailViaSMTP(string recipientEmail, string otp, string smtpHost, int smtpPort, string smtpUsername, string smtpPassword) returns error? {
    log:printInfo(string `Sending verification email via SMTP to: ${recipientEmail}`);
    
    email:SmtpConfiguration smtpConfig = {
        port: smtpPort,
        security: email:START_TLS_AUTO
    };
    
    email:SmtpClient smtpClient = check new (smtpHost, smtpUsername, smtpPassword, smtpConfig);
    
    email:Message emailMessage = {
        'from: smtpUsername,
        to: [recipientEmail],
        subject: "SafeRoute - Verify Your Email",
        body: generateVerificationEmailTemplate(otp, recipientEmail),
        contentType: "text/html"
    };
    
    check smtpClient->sendMessage(emailMessage);
    
    log:printInfo("Verification email sent successfully via SMTP");
    return ();
}

function generateVerificationEmailTemplate(string otp, string recipientEmail) returns string {
    return string `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SafeRoute Email Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">SafeRoute</h1>
            <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 16px;">Email Verification</p>
        </div>
        <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">Welcome to SafeRoute!</h2>
            <p style="color: #4b5563; font-size: 16px; margin: 0 0 30px 0; line-height: 1.5;">
                Thank you for signing up. Please verify your email address using the following verification code to complete your account creation:
            </p>
            <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 25px; text-align: center; margin: 30px 0;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 10px 0; font-weight: 500;">Verification Code</p>
                <div style="color: #1e293b; font-size: 36px; font-weight: 700; letter-spacing: 6px; font-family: 'Courier New', monospace;">${otp}</div>
            </div>
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 4px;">
                <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
                    This code expires in 10 minutes
                </p>
            </div>
        </div>
        <div style="background-color: #f8fafc; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center; line-height: 1.4;">
                © 2025 SafeRoute. This email was sent to ${recipientEmail}
            </p>
        </div>
    </div>
</body>
</html>`;
}

function generateOtp() returns string {
    int|error otp = random:createIntInRange(100000, 999999);
    if otp is error {
        time:Utc currentTime = time:utcNow();
        int timestamp = <int>currentTime[0];
        int fallbackOtp = (timestamp % 900000) + 100000;
        return fallbackOtp.toString();
    }
    return otp.toString();
}

function generateSalt() returns string {
    time:Utc currentTime = time:utcNow();
    [int, decimal] [timeSeconds, timeFraction] = currentTime;
    string timeString = timeSeconds.toString() + timeFraction.toString();
    
    int|error randomNum = random:createIntInRange(1000, 9999);
    if randomNum is int {
        timeString = timeString + randomNum.toString();
    }
    
    byte[] saltBytes = crypto:hashSha256(timeString.toBytes());
    return saltBytes.toBase64();
}

function generateJwt(string email, string jwtSecret, string jwtIssuer, string jwtAudience, int jwtExpiry) returns user:AuthResponse|error {
    time:Utc currentTime = time:utcNow();
    
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