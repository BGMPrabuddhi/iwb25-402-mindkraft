import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

public type User record {
    int id;
    string first_name;
    string last_name;
    string email;
    string password_hash;
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
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}
