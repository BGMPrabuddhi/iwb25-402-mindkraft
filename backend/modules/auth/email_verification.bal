// Email verification functions
public function sendVerificationOtp(user:SendVerificationRequest req) returns user:SendVerificationResponse|error {
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

    // Check if user is already verified
    var dbClient = database:getDbClient();
    stream<record {boolean is_email_verified;}, sql:Error?> userStream = 
        dbClient->query(`SELECT is_email_verified FROM users WHERE email = ${req.email}`);

    var userRecord = userStream.next();
    check userStream.close();

    if userRecord is sql:Error {
        return error("Database error occurred");
    }

    if userRecord is () {
        return {
            success: false,
            message: "User not found",
            errorCode: "user_not_found"
        };
    }

    if userRecord.value.is_email_verified {
        return {
            success: false,
            message: "Email already verified",
            errorCode: "already_verified"
        };
    }

    // Generate 6-digit OTP
    string otp = generateOtp();
    
    // Store OTP in database with expiration (10 minutes)
    int expirationTime = <int>time:utcNow()[0] + 600; // 10 minutes from now
    
    sql:ExecutionResult _ = check dbClient->execute(`
        INSERT INTO email_verification_otps (email, otp, expiration_time, is_used) 
        VALUES (${req.email}, ${otp}, ${expirationTime}, false)
        ON CONFLICT (email) 
        DO UPDATE SET otp = EXCLUDED.otp, expiration_time = EXCLUDED.expiration_time, is_used = false
    `);

    // Send OTP email
    error? emailResult = sendVerificationEmail(req.email, otp);
    if emailResult is error {
        return error("Failed to send verification email: " + emailResult.message());
    }

    return {
        success: true,
        message: "Verification OTP sent to your email address"
    };
}

public function verifyEmailOtp(user:VerifyEmailOtpRequest req) returns user:VerifyEmailOtpResponse|error {
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
            FROM email_verification_otps 
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
            message: "Invalid OTP. Please try again",
            errorCode: "invalid_otp"
        };
    }

    // Mark OTP as used
    sql:ExecutionResult _ = check dbClient->execute(`
        UPDATE email_verification_otps 
        SET is_used = true 
        WHERE email = ${req.email}
    `);

    // Mark user as verified
    sql:ExecutionResult _ = check dbClient->execute(`
        UPDATE users 
        SET is_email_verified = true 
        WHERE email = ${req.email}
    `);

    // Generate JWT token for auto-login after verification
    user:AuthResponse tokenData = check generateJwt(req.email);

    return {
        success: true,
        message: "Email verified successfully",
        token: tokenData.token
    };
}
