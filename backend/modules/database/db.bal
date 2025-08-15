import ballerina/sql;
import ballerinax/postgresql;
import ballerina/log;

// Configurable variables for database connection
configurable string host = "localhost";
configurable int port = 5432;
configurable string name = "saferoute_db";
configurable string username = "postgres";
configurable string password = "123456";

# Global database client instance
postgresql:Client? dbClient = ();

# Initialize database connection with configured values
# + return - error if connection fails, () if successful
public function initDatabase() returns error? {
    postgresql:Client|sql:Error newClient = new (
        host = host,
        port = port,
        database = name,
        username = username,
        password = password
    );
    
    if newClient is postgresql:Client {
        dbClient = newClient;
        log:printInfo("Database connection established successfully");
        return;
    }
    log:printError("Failed to establish database connection", newClient);
    return newClient;
}

# Get the initialized database client
#
# + return - PostgreSQL client if initialized, error if not initialized
public function getDbClient() returns postgresql:Client|error {
    postgresql:Client? currentClient = dbClient;
    if currentClient is postgresql:Client {
        return currentClient;
    }
    return error("Database client not initialized");
}

# Close database connection
#
# + return - error if closing fails, () if successful
public function closeDatabase() returns error? {
    postgresql:Client? currentClient = dbClient;
    if currentClient is postgresql:Client {
        error? closeResult = currentClient.close();
        if closeResult is error {
            return closeResult;
        }
    }
    return;
}