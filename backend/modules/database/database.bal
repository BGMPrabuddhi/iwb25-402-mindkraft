import ballerina/sql;
import ballerina/log;
import ballerinax/postgresql;
import saferoute/backend.types;

public type DatabaseError distinct error;

configurable string host = ?;
configurable int port = ?;
configurable string name = ?;
configurable string username = ?;
configurable string password = ?;

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
    string[] imagesArr = imageNames;
    sql:ParameterizedQuery insertQuery = `
        INSERT INTO hazard_reports (
            title, description, hazard_type, severity_level, images, latitude, longitude, address
        ) VALUES (
            ${title}, ${description}, ${hazardType}, ${severityLevel}, 
            ${imagesArr}, ${latitude}, ${longitude}, ${address}
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
        return error DatabaseError("Failed to retrieve inserted report ID");
    }
}

public function getAllReports() returns types:HazardReport[]|error {
    sql:ParameterizedQuery selectQuery = `
        SELECT id, title, description, hazard_type, severity_level, status, images, 
               latitude, longitude, address, created_at, updated_at
        FROM hazard_reports
        ORDER BY created_at DESC
    `;
    
    stream<record {}, sql:Error?> resultStream = check dbClient->query(selectQuery);
    types:HazardReport[] reports = [];
    
    check from record {} row in resultStream
        do {
            anydata idValue = row["id"];
            anydata titleValue = row["title"];
            anydata hazardTypeValue = row["hazard_type"];
            anydata severityLevelValue = row["severity_level"];
            anydata statusValue = row["status"];
            anydata createdAtValue = row["created_at"];
            
            if idValue is () || titleValue is () || hazardTypeValue is () || 
               severityLevelValue is () || statusValue is () || createdAtValue is () {
            } else {
                int id = idValue is int ? idValue : 0;
                string title = titleValue is string ? titleValue : "";
                string? description = <string?>row["description"];
                string hazardType = hazardTypeValue is string ? hazardTypeValue : "";
                string severityLevel = severityLevelValue is string ? severityLevelValue : "";
                string status = statusValue is string ? statusValue : "";
                
                anydata imagesValue = row["images"];
                string[] images = imagesValue is string[] ? imagesValue : [];
                
                decimal? latitude = <decimal?>row["latitude"];
                decimal? longitude = <decimal?>row["longitude"];
                string? address = <string?>row["address"];
                
                string createdAt = createdAtValue is string ? createdAtValue : "";
                string? updatedAt = <string?>row["updated_at"];
                
                types:Location? location = ();
                if latitude is decimal && longitude is decimal {
                    location = {
                        lat: latitude,
                        lng: longitude,
                        address: address
                    };
                }
                
                types:HazardReport report = {
                    id: id,
                    title: title,
                    description: description,
                    hazard_type: hazardType,
                    severity_level: severityLevel,
                    status: status,
                    images: images,
                    location: location,
                    created_at: createdAt,
                    updated_at: updatedAt
                };
                
                reports.push(report);
            }
        };
    
    error? closeErr = resultStream.close();
    if closeErr is error {
        log:printError("Error closing result stream", closeErr);
    }
    
    return reports;
}

public function updateHazardReport(
    int reportId,
    string title,
    string description,
    string hazardType,
    string severityLevel
) returns types:HazardReport|error {
    sql:ParameterizedQuery updateQuery = `
        UPDATE hazard_reports 
        SET title = ${title}, 
            description = ${description}, 
            hazard_type = ${hazardType}, 
            severity_level = ${severityLevel},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${reportId}
        RETURNING id, title, description, hazard_type, severity_level, status, images, 
                  latitude, longitude, address, created_at, updated_at
    `;
    
    stream<record {}, sql:Error?> resultStream = check dbClient->query(updateQuery);
    record {}? row = check resultStream.next();
    error? closeErr = resultStream.close();
    if closeErr is error {
        log:printError("Error closing result stream", closeErr);
    }
    
    if row is record {} {
        anydata idValue = row["id"];
        if idValue is () {
            return error DatabaseError("Report ID is null");
        }
        int id = idValue is int ? idValue : 0;
        
        anydata titleValue = row["title"];
        if titleValue is () {
            return error DatabaseError("Report title is null");
        }
        string titleResult = titleValue is string ? titleValue : "";
        
        string? descriptionResult = <string?>row["description"];
        
        anydata hazardTypeValue = row["hazard_type"];
        if hazardTypeValue is () {
            return error DatabaseError("Report hazard type is null");
        }
        string hazardTypeResult = hazardTypeValue is string ? hazardTypeValue : "";
        
        anydata severityLevelValue = row["severity_level"];
        if severityLevelValue is () {
            return error DatabaseError("Report severity level is null");
        }
        string severityLevelResult = severityLevelValue is string ? severityLevelValue : "";
        
        anydata statusValue = row["status"];
        if statusValue is () {
            return error DatabaseError("Report status is null");
        }
        string statusResult = statusValue is string ? statusValue : "";
        
        anydata imagesValue = row["images"];
        string[] imagesResult = imagesValue is string[] ? imagesValue : [];
        
        decimal? latitudeResult = <decimal?>row["latitude"];
        decimal? longitudeResult = <decimal?>row["longitude"];
        string? addressResult = <string?>row["address"];
        
        anydata createdAtValue = row["created_at"];
        if createdAtValue is () {
            return error DatabaseError("Report created_at is null");
        }
        string createdAtResult = createdAtValue is string ? createdAtValue : "";
        
        string? updatedAtResult = <string?>row["updated_at"];
        
        types:Location? locationResult = ();
        if latitudeResult is decimal && longitudeResult is decimal {
            locationResult = {
                lat: latitudeResult,
                lng: longitudeResult,
                address: addressResult
            };
        }
        
        types:HazardReport updatedReport = {
            id: id,
            title: titleResult,
            description: descriptionResult,
            hazard_type: hazardTypeResult,
            severity_level: severityLevelResult,
            status: statusResult,
            images: imagesResult,
            location: locationResult,
            created_at: createdAtResult,
            updated_at: updatedAtResult
        };
        
        log:printInfo("Report updated with ID: " + id.toString());
        return updatedReport;
    } else {
        return error DatabaseError("Report not found or update failed");
    }
}

public function deleteHazardReport(int reportId) returns boolean|error {
    sql:ParameterizedQuery deleteQuery = `
        DELETE FROM hazard_reports 
        WHERE id = ${reportId}
    `;
    
    sql:ExecutionResult result = check dbClient->execute(deleteQuery);
    
    if result.affectedRowCount > 0 {
        log:printInfo("Report deleted with ID: " + reportId.toString());
        return true;
    } else {
        return error DatabaseError("Report not found or delete failed");
    }
}
