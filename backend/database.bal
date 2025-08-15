import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;
import ballerina/sql;

// Configurable variables for database connection
configurable string host = "localhost";
configurable int port = 5432;
configurable string name = "saferoute_db";
configurable string username = "postgres";
configurable string password = "123456";

# Global database client instance
postgresql:Client? dbClient = ();

# Initialize database connection
# + return - Error if initialization fails
public function initDatabase() returns error? {
    postgresql:Client|error newClient = new (
        host = host,
        port = port,
        database = name,
        username = username,
        password = password
    );
    
    if newClient is error {
        return error("Failed to initialize database connection: " + newClient.message());
    }
    
    dbClient = newClient;
    return;
}

# Test database connection
# + return - Error if connection test fails
public function testConnection() returns error? {
    postgresql:Client? currentClient = dbClient;
    if currentClient is postgresql:Client {
        stream<record{}, sql:Error?> resultStream = currentClient->query(`SELECT 1`);
        var closeResult = resultStream.close();
        return closeResult;
    }
    return error("Database client not initialized");
}