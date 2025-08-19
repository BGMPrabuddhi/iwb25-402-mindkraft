import ballerina/log;
import ballerina/email;

// Email Configuration
configurable string smtpHost = ?;
configurable int smtpPort = ?;
configurable string smtpUsername = ?;
configurable string smtpPassword = ?;
configurable boolean emailEnabled = ?;

// Email template constants
const string EMAIL_SUBJECT = "SafeRoute - Password Reset OTP";
const int OTP_VALIDITY_MINUTES = 10;

public function sendOtpEmail(string recipientEmail, string otp) returns error? {
    log:printInfo(string `📧 Password reset requested for: ${recipientEmail}`);
    
    if emailEnabled {
        return sendEmailViaSMTP(recipientEmail, otp);
    } else {
        return logOtpForDevelopment(recipientEmail, otp);
    }
}

function logOtpForDevelopment(string recipientEmail, string otp) returns error? {
    // Development mode: Log the OTP for testing
    string separator = "============================================================";
    log:printInfo(separator);
    log:printInfo("🔔 EMAIL SERVICE - DEVELOPMENT MODE");
    log:printInfo(separator);
    log:printInfo(string `📧 To: ${recipientEmail}`);
    log:printInfo(string `📋 Subject: ${EMAIL_SUBJECT}`);
    log:printInfo(string `🔐 OTP Code: ${otp}`);
    log:printInfo(string `⏰ Valid for: ${OTP_VALIDITY_MINUTES} minutes`);
    log:printInfo(separator);
    log:printInfo("💡 To enable actual email sending:");
    log:printInfo("   1. Configure email service (SendGrid, SES, etc.)");
    log:printInfo("   2. Set emailEnabled=true in Config.toml");
    log:printInfo(separator);
    
    return ();
}

function sendEmailViaSMTP(string recipientEmail, string otp) returns error? {
    log:printInfo(string `🚀 Sending email via SMTP to: ${recipientEmail}`);
    log:printInfo(string `� SMTP Config: ${smtpHost}:${smtpPort.toString()}`);
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
        subject: EMAIL_SUBJECT,
        body: generateEmailTemplate(otp, recipientEmail),
        contentType: "text/html"
    };
    
    // Send email
    check smtpClient->sendMessage(emailMessage);
    
    log:printInfo("✅ Email sent successfully via SMTP");
    return ();
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
                    This code expires in ${OTP_VALIDITY_MINUTES} minutes
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
