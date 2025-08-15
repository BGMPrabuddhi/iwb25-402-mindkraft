public type RegisterRequest record {
    string firstName;
    string lastName;
    string email;
    string password;
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
    string createdAt?;
};
