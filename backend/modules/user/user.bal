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
    string createdAt?;
};
