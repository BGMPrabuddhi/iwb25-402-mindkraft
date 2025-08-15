import ballerina/sql;
import ballerinax/postgresql;
import ballerina/log;

// Insert hazard report into the database
public function insertHazardReport(
    postgresql:Client dbClient,
    string title,
    string description,
    string hazardType,
    string severityLevel
) returns int|error {
    sql:ParameterizedQuery pq = `INSERT INTO hazard_reports (title, description, hazard_type, severity_level) VALUES (${title}, ${description}, ${hazardType}, ${severityLevel}) RETURNING id`;
    int|sql:Error result = dbClient->queryRow(pq, int);
    if result is int {
        log:printInfo("Hazard report inserted with ID: " + result.toString());
        return result;
    } else {
        log:printError("Failed to insert hazard report", result);
        return result;
    }
}