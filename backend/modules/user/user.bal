public type LocationDetails record {
    decimal latitude;
    decimal longitude;
    string city;
    string state;
    string country;
    string fullAddress;
};

public type RegisterRequest record {
    string firstName;
    string lastName;
    string email;
    string password;
    string location;
    LocationDetails locationDetails;
};

public type LoginRequest record {
    string email;
    string password;
};

public type AuthResponse record {
    string token;
    string tokenType;
    int expiresIn;
    string message;
};

public type UserProfile record {
    int id;
    string firstName;
    string lastName;
    string email;
    string location;
    LocationDetails locationDetails;
    string? profileImage?;
    string createdAt?;
};

public type UpdateProfileRequest record {
    string firstName;
    string lastName;
    string location;
    string? profileImage?; // Base64 encoded image - optional
};

public type UpdateProfileResponse record {
    boolean success;
    string message;
    UserProfile? user?;
    string? errorCode?;
};

// Password Recovery Types
public type ForgotPasswordRequest record {
    string email;
};

public type ForgotPasswordResponse record {
    boolean success;
    string message;
    string? errorCode?;
};

public type VerifyOtpRequest record {
    string email;
    string otp;
};

public type VerifyOtpResponse record {
    boolean success;
    string message;
    string? resetToken?;
    string? errorCode?;
};

public type ResetPasswordRequest record {
    string resetToken;
    string newPassword;
    string confirmPassword;
};

public type ResetPasswordResponse record {
    boolean success;
    string message;
    string? errorCode?;
};
