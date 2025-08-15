import ballerina/sql;
import ballerinax/postgresql;
import ballerina/log;

# Database configuration type
#
# + host - Database server hostname
# + port - Database server port
# + name - Database name
# + username - Database username
# + password - Database password
public type DatabaseConfig record {|
    string host;
    int port;
    string name;
    string username;
    string password;
|};

# Global database client instance
postgresql:Client? dbClient = ();

# Initialize database connection with given configuration
#
# + config - Database configuration containing connection details
# + return - error if connection fails, () if successful
public function initDatabase(DatabaseConfig config) returns error? {
    postgresql:Client|sql:Error newClient = new (
        host = config.host,
        port = config.port,
        database = config.name,
        username = config.username,
        password = config.password
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