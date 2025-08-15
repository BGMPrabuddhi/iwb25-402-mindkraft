import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;
import ballerina/sql;

// Configurable variables for database connection
configurable string host = "localhost";
configurable int port = 5432;
configurable string name = "saferoute_db";
configurable string username = "postgres";
configurable string password = "123456";

// Database client initialization
final postgresql:Client dbClient = check new(
    host = host,
    port = port,
    database = name,
    username = username,
    password = password
);

// Test connection function
public function testConnection() returns error? {
    // Simple connection test
    stream<record{}, sql:Error?> resultStream = dbClient->query(`SELECT 1`);
    var closeResult = resultStream.close();
    return closeResult;
}