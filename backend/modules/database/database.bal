import ballerina/sql;
import ballerina/log;
import ballerinax/postgresql;

configurable string host = "localhost";
configurable int port = 5432;
configurable string name = "saferoute_db";
configurable string username = "postgres";
configurable string password = "123456";

final postgresql:Client dbClient = check new (
    host = host,
    port = port,
    database = name,
    username = username,
    password = password,
    connectionPool = {
        maxOpenConnections: 15,
        minIdleConnections: 5
    },
    options = {
        connectTimeout: 30,
        socketTimeout: 30
    }
);

public function getDbClient() returns postgresql:Client {
    return dbClient;
}

public function testConnection() returns boolean {
    do {
        stream<record{}, sql:Error?> resultStream = check dbClient->query(`SELECT 1`);
        error? err = resultStream.close();
        if err is error {
            log:printError("Database connection test failed", err);
            return false;
        }
        log:printInfo("Database connection test successful");
        return true;
    } on fail {
        log:printError("Database connection test failed");
        return false;
    }
}

public function insertHazardReport(
    string title,
    string description,
    string hazardType,
    string severityLevel,
    string[] imageNames,
    decimal? latitude,
    decimal? longitude,
    string? address
) returns int|error {
    // Convert imageNames to TEXT[] for PostgreSQL
    string[] imagesArr = imageNames;
    // Prepare SQL statement
    sql:ParameterizedQuery insertQuery = `
        INSERT INTO hazard_reports (
            title, description, hazard_type, severity_level, images, latitude, longitude, address
        ) VALUES (
            ${title}, ${description}, ${hazardType}, ${severityLevel}, ${imagesArr}, ${latitude}, ${longitude}, ${address}
        ) RETURNING id;
    `;
    stream<record {int id;}, sql:Error?> resultStream = check dbClient->query(insertQuery);
    record {| record {int id;} value; |}? nextRow = check resultStream.next();
    error? closeErr = resultStream.close();
    if closeErr is error {
        log:printError("Error closing result stream", closeErr);
    }
    if nextRow is record {| record {int id;} value; |} {
        int id = nextRow.value.id;
        log:printInfo("Report inserted with ID: " + id.toString());
        return id;
    } else {
        return error("Failed to retrieve inserted report ID");
    }
}
