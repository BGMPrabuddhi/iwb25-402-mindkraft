import ballerina/sql;
import ballerina/log;
import ballerinax/postgresql;
import saferoute/backend.types;

configurable string host = "localhost";
configurable int port = 5432;
configurable string database = "saferoute_db";
configurable string username = "postgres";
configurable string password = "123456";

final postgresql:Client dbClient = check new (
    host = host,
    port = port,
    database = database,
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

// Get database client
public function getDbClient() returns postgresql:Client {
    return dbClient;
}

// Test database connection
public function testConnection() returns boolean {
    do {
        stream<record{}, sql:Error?> resultStream = dbClient->query(`SELECT 1`);
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

// Insert new hazard report
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
    
    sql:ParameterizedQuery insertQuery = `
        INSERT INTO hazard_reports (
            title, description, hazard_type, severity_level, images, latitude, longitude, address
        ) VALUES (
            ${title}, ${description}, ${hazardType}, ${severityLevel}, ${imageNames}, ${latitude}, ${longitude}, ${address}
        ) RETURNING id;
    `;
    
    stream<record {int id;}, sql:Error?> resultStream = dbClient->query(insertQuery);
    record {| record {int id;} value; |}|sql:Error? nextRow = resultStream.next();
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

// Get hazard reports with filtering and pagination
public function getHazardReports(string? hazardType, string? severity, string? status, 
                                int page, int pageSize) returns record {|
    types:DbHazardReport[] reports;
    int total_count;
|}|error {
    
    sql:ParameterizedQuery countQuery = `SELECT COUNT(*) FROM hazard_reports`;
    int|sql:Error totalCount = dbClient->queryRow(countQuery);
    
    if totalCount is sql:Error {
        return error("Failed to get total count: " + totalCount.message());
    }
    
    int offset = (page - 1) * pageSize;
    sql:ParameterizedQuery dataQuery = `SELECT id, title, description, hazard_type, severity_level, status, images, latitude, longitude, address, created_at, updated_at FROM hazard_reports ORDER BY created_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
    
    stream<types:DbHazardReport, sql:Error?> resultStream = dbClient->query(dataQuery);
    types:DbHazardReport[] reports = check from types:DbHazardReport report in resultStream
                                           select report;
    
    return {
        reports: reports,
        total_count: totalCount
    };
}

// Get filtered hazard reports for route viewer
// Get filtered hazard reports for route viewer
public function getFilteredHazardReports(
    string hazardType,
    string severity,
    string status,
    decimal? fromLat,
    decimal? fromLng,
    decimal? toLat,
    decimal? toLng,
    int page,
    int pageSize
) returns types:HazardReport[]|error {
    
    // Build base query
    sql:ParameterizedQuery baseQuery = `SELECT id, title, description, hazard_type, severity_level, images, latitude, longitude, address, created_at, status FROM hazard_reports WHERE 1=1`;
    
    // Add filters conditionally
    if hazardType != "" && hazardType != "all" {
        baseQuery = sql:queryConcat(baseQuery, ` AND hazard_type = ${hazardType}`);
    }
    
    if severity != "" && severity != "all" {
        baseQuery = sql:queryConcat(baseQuery, ` AND severity_level = ${severity}`);
    }
    
    if status != "" && status != "all" {
        baseQuery = sql:queryConcat(baseQuery, ` AND status = ${status}`);
    }
    
    // Add ordering
    baseQuery = sql:queryConcat(baseQuery, ` ORDER BY created_at DESC`);
    
    // Add pagination
    int offset = (page - 1) * pageSize;
    baseQuery = sql:queryConcat(baseQuery, ` LIMIT ${pageSize} OFFSET ${offset}`);
    
    stream<record {|
        int id;
        string title;
        string? description;
        string hazard_type;
        string severity_level;
        string[] images;
        float? latitude;
        float? longitude;
        string? address;
        string created_at;
        string status;
    |}, sql:Error?> resultStream = dbClient->query(baseQuery);
    
    types:HazardReport[] reports = [];
    check from var row in resultStream
        do {
            types:Location? location = ();
            if row.latitude is float && row.longitude is float {
                location = {
                    lat: <decimal>row.latitude,
                    lng: <decimal>row.longitude,
                    address: row.address
                };
            } else {
                log:printWarn("Hazard report missing location data: id=" + row.id.toString());
            }
            types:HazardReport report = {
                id: row.id,
                title: row.title,
                description: row.description,
                hazard_type: row.hazard_type,
                severity_level: row.severity_level,
                images: row.images,
                location: location,
                created_at: row.created_at,
                status: row.status,
                updated_at: ()
            };
            reports.push(report);
        };
    
    return reports;
}
// Get single hazard report by ID
public function getHazardReportById(int id) returns types:DbHazardReport|error {
    sql:ParameterizedQuery query = `
        SELECT id, title, description, hazard_type, severity_level, status, images,
               latitude, longitude, address, created_at, updated_at
        FROM hazard_reports WHERE id = ${id}
    `;
    
    types:DbHazardReport|sql:Error result = dbClient->queryRow(query);
    if result is sql:Error {
        return error("Report not found or database error: " + result.message());
    }
    
    return result;
}

// Update hazard report
public function updateHazardReport(int id, string? title, string? description, 
                                  string? hazardType, string? severityLevel, string? status) 
                                  returns boolean|error {
    
    sql:ParameterizedQuery updateQuery = `UPDATE hazard_reports SET updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
    sql:ExecutionResult|sql:Error result = dbClient->execute(updateQuery);
    
    if result is sql:Error {
        return error("Failed to update report: " + result.message());
    }
    
    return result.affectedRowCount > 0;
}

// Delete hazard report
public function deleteHazardReport(int id) returns boolean|error {
    sql:ParameterizedQuery query = `DELETE FROM hazard_reports WHERE id = ${id}`;
    
    sql:ExecutionResult|sql:Error result = dbClient->execute(query);
    if result is sql:Error {
        return error("Failed to delete report: " + result.message());
    }
    
    return result.affectedRowCount > 0;
}