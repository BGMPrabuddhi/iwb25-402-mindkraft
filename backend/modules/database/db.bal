import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

public type User record {
    int id;
    string first_name;
    string last_name;
    string email;
    string password_hash;
    string location;
    decimal latitude;
    decimal longitude;
    string city;
    string state;
    string country;
    string full_address;
    string created_at?;
};

configurable string host = ?;
configurable int port = ?;
configurable string name = ?;
configurable string username = ?;
configurable string password = ?;

final postgresql:Client dbClient = check new(
    host = host,
    port = port,
    database = name,
    username = username,
    password = password
);

public function getDbClient() returns postgresql:Client {
    return dbClient;
}

public function initializeDatabase() returns error? {
    // Create the complete users table with all required fields including location
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(500) NOT NULL,
            location VARCHAR(500) NOT NULL,
            latitude DECIMAL(10, 8) NOT NULL,
            longitude DECIMAL(11, 8) NOT NULL,
            city VARCHAR(100) NOT NULL,
            state VARCHAR(100) NOT NULL,
            country VARCHAR(100) NOT NULL,
            full_address TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Create indexes for better performance
    _ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    _ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_users_coordinates ON users(latitude, longitude)`);
}
