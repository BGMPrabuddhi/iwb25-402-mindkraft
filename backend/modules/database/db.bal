import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;
import ballerina/sql;
import ballerina/log;

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

public function initializeDatabase() returns error? {
    // Create users table
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
            profile_image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Create hazard_reports table
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS hazard_reports (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            hazard_type VARCHAR(100) NOT NULL,
            severity_level VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            images TEXT[] DEFAULT '{}',
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Create indexes
    _ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    _ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_users_coordinates ON users(latitude, longitude)`);
    _ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_hazard_reports_type ON hazard_reports(hazard_type)`);
    _ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_hazard_reports_severity ON hazard_reports(severity_level)`);
    _ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_hazard_reports_coordinates ON hazard_reports(latitude, longitude)`);
    
    log:printInfo("Database tables and indexes created successfully");
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

// Get filtered hazard reports (without types: dependency)
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
) returns record {|
    int id;
    string title;
    string? description;
    string hazard_type;
    string severity_level;
    string[] images;
    record {|
        decimal lat;
        decimal lng;
        string? address;
    |}? location;
    string created_at;
    string status;
    string? updated_at;
|}[]|error {
    
    sql:ParameterizedQuery baseQuery = `
        SELECT id, title, description, hazard_type, severity_level, images, 
               latitude, longitude, address, created_at, status 
        FROM hazard_reports WHERE 1=1
    `;
    
    if hazardType != "" && hazardType != "all" {
        baseQuery = sql:queryConcat(baseQuery, ` AND hazard_type = ${hazardType}`);
    }
    
    if severity != "" && severity != "all" {
        baseQuery = sql:queryConcat(baseQuery, ` AND severity_level = ${severity}`);
    }
    
    if status != "" && status != "all" {
        baseQuery = sql:queryConcat(baseQuery, ` AND status = ${status}`);
    }
    
    baseQuery = sql:queryConcat(baseQuery, ` ORDER BY created_at DESC`);
    int offset = (page - 1) * pageSize;
    baseQuery = sql:queryConcat(baseQuery, ` LIMIT ${pageSize} OFFSET ${offset}`);
    
    stream<record {|
        int id;
        string title;
        string? description;
        string hazard_type;
        string severity_level;
        string[] images;
        decimal? latitude;
        decimal? longitude;
        string? address;
        string created_at;
        string status;
    |}, sql:Error?> resultStream = dbClient->query(baseQuery);
    
    record {|
        int id;
        string title;
        string? description;
        string hazard_type;
        string severity_level;
        string[] images;
        record {|
            decimal lat;
            decimal lng;
            string? address;
        |}? location;
        string created_at;
        string status;
        string? updated_at;
    |}[] reports = [];
    
    check from var row in resultStream
        do {
            record {|
                decimal lat;
                decimal lng;
                string? address;
            |}? location = ();

            if row.latitude is decimal && row.longitude is decimal {
                decimal validLat = <decimal>row.latitude;
                decimal validLng = <decimal>row.longitude;
                location = {
                    lat: validLat,
                    lng: validLng,
                    address: row.address
                };
            } else {
                location = ();
                log:printWarn("Hazard report missing location data: id=" + row.id.toString());
            }

            reports.push({
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
            });
        };
    
    return reports;
}