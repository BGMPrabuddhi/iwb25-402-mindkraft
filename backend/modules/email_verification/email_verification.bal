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
    
    // Store pending user data (matching the updated table schema)
    sql:ExecutionResult _ = check dbClient->execute(`
        INSERT INTO pending_user_registrations (
            email, first_name, last_name, contact_number, password_hash, user_role,
            latitude, longitude, address, otp, expiration_time
        ) VALUES (
            ${req.email}, ${req.firstName}, ${req.lastName}, 
            ${req["contactNumber"] is string ? req["contactNumber"] : ()}, 
            ${passwordHash}, ${req.userRole}, ${req.locationDetails.latitude}, 
            ${req.locationDetails.longitude}, ${req.locationDetails.address}, 
            ${otp}, ${expirationTime}
        )
        ON CONFLICT (email) 
        DO UPDATE SET 
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            contact_number = EXCLUDED.contact_number,
            password_hash = EXCLUDED.password_hash,
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
        string? contact_number;
        string email;
        string password_hash;
        string user_role;
        decimal latitude;
        decimal longitude;
        string address;
        string otp;
        int expiration_time;
    |}, sql:Error?> pendingStream = dbClient->query(`
        SELECT first_name, last_name, contact_number, email, password_hash, user_role,
               latitude, longitude, address, otp, expiration_time
        FROM pending_user_registrations 
        WHERE email = ${email}
    `);
    
    record {| record {| 
        string first_name;
        string last_name;
        string? contact_number;
        string email;
        string password_hash;
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
        string? contact_number;
        string email;
        string password_hash;
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
            first_name, last_name, contact_number, email, password_hash, latitude, longitude, address, user_role, is_email_verified
        ) VALUES (
            ${pending.first_name}, ${pending.last_name}, ${pending.contact_number is string ? pending.contact_number : null}, ${pending.email}, ${pending.password_hash}, ${pending.latitude}, ${pending.longitude}, ${pending.address}, ${pending.user_role}, true
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
<html lang="en" style="margin:0; padding:0;">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>SafeRoute Email Verification</title>
    <meta name="x-apple-disable-message-reformatting" />
    <style>
        body,table,td,div,p,a { font-family:'Segoe UI', Arial, sans-serif !important; }
        @media (prefers-color-scheme: dark) {
            body { background:#0f172a !important; }
        }
    </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;-webkit-font-smoothing:antialiased;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                 style="background:#f1f5f9;padding:24px 0;">
        <tr>
            <td align="center" style="padding:0 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
                             style="max-width:620px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,0.08);border:1px solid #e2e8f0;">
                    <tr>
                        <td style="padding:44px 40px 12px 40px;">
                            <h1 style="margin:0 0 4px 0;font-size:24px;line-height:1.2;color:#0f172a;font-weight:800;letter-spacing:.4px;">
                                Verify Your Email
                            </h1>
                            <p style="margin:0 0 24px 0;font-size:14px;letter-spacing:.5px;font-weight:600;text-transform:uppercase;color:#0d9488;">
                                Complete Your Registration
                            </p>
                            <p style="margin:0 0 26px 0;font-size:15px;line-height:1.55;color:#334155;">
                                Welcome to SafeRoute! Use the verification code below to activate your account.
                                If you didn't initiate this registration, you can safely ignore this email.
                            </p>
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                                         style="margin:12px 0 8px 0;">
                                <tr>
                                    <td style="background:#f0fdfa;border:2px solid #99f6e4;border-radius:16px;padding:30px 20px;text-align:center;">
                                        <p style="margin:0 0 12px 0;font-size:13px;letter-spacing:1px;font-weight:600;color:#0f766e;text-transform:uppercase;">
                                            Verification Code
                                        </p>
                                        <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#134e4a;font-family:'Segoe UI',Arial,sans-serif;">
                                            ${otp}
                                        </div>
                                        <p style="margin:18px 0 0 0;font-size:12px;color:#0f766e;letter-spacing:.5px;">
                                            Code valid for <strong style="color:#0d9488;">10 minutes</strong>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            <div style="margin:34px 0 12px 0;border-left:4px solid #f59e0b;background:#fffbeb;padding:14px 18px;border-radius:10px;">
                                <p style="margin:0;font-size:13px;line-height:1.5;color:#92400e;">
                                    Never share this code. SafeRoute staff will never ask for it.
                                </p>
                            </div>
                            <p style="margin:30px 0 0 0;font-size:13px;line-height:1.6;color:#475569;">
                                Having trouble? Reply to this email and our support team will help.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:28px 30px 40px 30px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                                         style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:14px;">
                                <tr>
                                    <td style="padding:18px 24px;text-align:center;">
                                        <p style="margin:0 0 6px 0;font-size:12px;color:#64748b;">
                                            This verification email was sent to
                                            <strong style="color:#0f172a;">${recipientEmail}</strong>.
                                        </p>
                                        <p style="margin:0;font-size:11px;line-height:1.6;color:#94a3b8;">
                                            © 2025 SafeRoute. All rights reserved.<br/>
                                            If you didn't sign up, you can ignore this.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
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