import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;
import ballerina/sql;
import ballerina/log;
import saferoute/backend.location;

public type DatabaseError distinct error;

public type User record {
    int id;
    string first_name;
    string last_name;
    string email;
    string password_hash;
    decimal latitude;
    decimal longitude;
    string address;
    string? profile_image;
    string? created_at;
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
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        address TEXT NOT NULL,
        profile_image TEXT,
        user_role VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);

    // Ensure column exists if table was created earlier without it
    _ = check dbClient->execute(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false
    `);

    // Create table for email verification OTPs (used in registration & email verification)
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS email_verification_otps (
            email VARCHAR(255) PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
            otp VARCHAR(10) NOT NULL,
            expiration_time INT NOT NULL,
            is_used BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create table for password reset OTPs
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS password_reset_otps (
            email VARCHAR(255) PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
            otp VARCHAR(10) NOT NULL,
            expiration_time INT NOT NULL,
            is_used BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Add password_reset_otps table
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS password_reset_otps (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            otp VARCHAR(6) NOT NULL,
            expiration_time BIGINT NOT NULL,
            is_used BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(email)
        )
    `);
    
    // Create hazard_reports table
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS hazard_reports (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            hazard_type VARCHAR(100) NOT NULL,
            severity_level VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            images TEXT[] DEFAULT '{}',
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            address TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

     // Create resolved_hazard_reports table
    _ = check dbClient->execute(`
        CREATE TABLE IF NOT EXISTS resolved_hazard_reports (
            id SERIAL PRIMARY KEY,
            original_report_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            hazard_type VARCHAR(100) NOT NULL,
            severity_level VARCHAR(50) NOT NULL,
            images TEXT[] DEFAULT '{}',
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            address TEXT,
            created_at TIMESTAMP NOT NULL,
            resolved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_by INTEGER,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
        )
    `);

    // Create table for pending user registrations
_ = check dbClient->execute(`
    CREATE TABLE IF NOT EXISTS pending_user_registrations (
        email VARCHAR(255) PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        password_hash VARCHAR(500) NOT NULL,
        location TEXT NOT NULL,
        user_role VARCHAR(50) NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        address TEXT NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expiration_time INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);
    
   // Create indexes for users
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_users_coordinates ON users(latitude, longitude)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_users_address ON users(address)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(user_role)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_users_verified ON users(is_email_verified)`);

// Create indexes for password_reset_otps
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(email)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expiration ON password_reset_otps(expiration_time)`);

// Create indexes for pending registrations
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_pending_registrations_email ON pending_user_registrations(email)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_pending_registrations_expiration ON pending_user_registrations(expiration_time)`);

// Create indexes for email verification OTPs
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_email_verification_expiry ON email_verification_otps(expiration_time)`);

// Create indexes for hazard_reports
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_hazard_reports_user_id ON hazard_reports(user_id)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_hazard_reports_type ON hazard_reports(hazard_type)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_hazard_reports_severity ON hazard_reports(severity_level)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_hazard_reports_coordinates ON hazard_reports(latitude, longitude)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_hazard_reports_status ON hazard_reports(status)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_hazard_reports_created_at ON hazard_reports(created_at)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_hazard_reports_status_created_at ON hazard_reports(status, created_at)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_hazard_reports_location_time ON hazard_reports(latitude, longitude, created_at)`);

// Create indexes for resolved_hazard_reports
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_resolved_reports_user_id ON resolved_hazard_reports(user_id)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_resolved_reports_type ON resolved_hazard_reports(hazard_type)`);
_ = check dbClient->execute(`CREATE INDEX IF NOT EXISTS idx_resolved_reports_resolved_at ON resolved_hazard_reports(resolved_at)`);
    log:printInfo("Database tables and indexes created successfully");
}

public function insertHazardReport(
    int userId,
    string title,
    string description,
    string hazardType,
    string severityLevel,
    string[] imageNames,
    decimal? latitude,
    decimal? longitude,
    string? address
) returns int|error {
    
    // Determine status based on hazard type - traffic reports are immediately active
    string status = "active";
    if hazardType == "pothole" || hazardType == "construction" {
        status = "pending"; // These need RDA review
    }
    
    // Determine district from coordinates or address
    string? district = ();
    if latitude is decimal && longitude is decimal {
        district = location:getDistrictFromCoordinates(latitude, longitude);
    }
    
    // Fallback to extracting from address if coordinates didn't work
    if district is () && address is string {
        district = location:extractDistrictFromAddress(address);
    }
    
    log:printInfo("DATABASE: Inserting hazard report with district: " + (district ?: "Unknown"));
    
    sql:ParameterizedQuery insertQuery = `
        INSERT INTO hazard_reports (
            user_id, title, description, hazard_type, severity_level, status, images, latitude, longitude, address, district
        ) VALUES (
            ${userId}, ${title}, ${description}, ${hazardType}, ${severityLevel}, ${status}, ${imageNames}, ${latitude}, ${longitude}, ${address}, ${district}
        ) RETURNING id;
    `;
    
    stream<record {int id;}, sql:Error?> resultStream = dbClient->query(insertQuery);
    record {| record {int id;} value; |}|sql:Error? nextRow = check resultStream.next();
    error? closeErr = resultStream.close();
    
    if closeErr is error {
        log:printError("Error closing result stream", closeErr);
    }
    
    if nextRow is record {| record {int id;} value; |} {
        int id = nextRow.value.id;
        log:printInfo("Report inserted with ID: " + id.toString() + " with status: " + status);
        return id;
    } else {
        return error DatabaseError("Failed to retrieve inserted report ID");
    }
}

public function getCurrentTrafficAlerts(decimal userLat, decimal userLng) returns record {|
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
    int user_id;
    float distance_km;
|}[]|error {
    
    log:printInfo("DATABASE: getCurrentTrafficAlerts called with lat: " + userLat.toString() + ", lng: " + userLng.toString());
    
    sql:ParameterizedQuery selectQuery = `
        SELECT id, user_id, title, description, hazard_type, severity_level, images, 
               latitude, longitude, address, created_at, status, updated_at,
               (6371 * acos(GREATEST(-1, LEAST(1,
                   cos(radians(${userLat})) * cos(radians(latitude)) * 
                   cos(radians(longitude) - radians(${userLng})) + 
                   sin(radians(${userLat})) * sin(radians(latitude))
               )))) as distance_km
        FROM hazard_reports
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND created_at >= NOW() - INTERVAL '24 hours'
        AND status IN ('active', 'pending', 'confirmed')
        AND (6371 * acos(GREATEST(-1, LEAST(1,
            cos(radians(${userLat})) * cos(radians(latitude)) * 
            cos(radians(longitude) - radians(${userLng})) + 
            sin(radians(${userLat})) * sin(radians(latitude))
        )))) <= 25
        ORDER BY distance_km ASC, created_at DESC
    `;
    
    log:printInfo("DATABASE: Executing query...");
    
    stream<record {|
        int id;
        int user_id;
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
        string? updated_at;
        float distance_km;
    |}, sql:Error?> resultStream = dbClient->query(selectQuery);
    
    log:printInfo("DATABASE: Query executed, processing results...");
    
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
        int user_id;
        float distance_km;
    |}[] reports = [];
    
    error? fromResult = from var row in resultStream
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
            }

            reports.push({
                id: row.id,
                user_id: row.user_id,
                title: row.title,
                description: row.description,
                hazard_type: row.hazard_type,
                severity_level: row.severity_level,
                images: row.images,
                location: location,
                created_at: row.created_at,
                status: row.status,
                updated_at: row.updated_at,
                distance_km: row.distance_km
            });
        };
    
    if fromResult is error {
        log:printError("Error processing traffic alerts: " + fromResult.message());
        return fromResult;
    }
    
    error? closeErr = resultStream.close();
    if closeErr is error {
        log:printError("Error closing result stream", closeErr);
    }
    
    log:printInfo("Found " + reports.length().toString() + " traffic alerts within 25km");
    return reports;
}

// Keep all your existing functions unchanged...
public function getAllReports() returns record {|
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
    int user_id;
    string? district;
|}[]|error {
    
    sql:ParameterizedQuery selectQuery = `
        SELECT id, user_id, title, description, hazard_type, severity_level, images, 
               latitude, longitude, address, district, created_at, status, updated_at
        FROM hazard_reports
        ORDER BY created_at DESC
    `;
    
    stream<record {|
        int id;
        int user_id;
        string title;
        string? description;
        string hazard_type;
        string severity_level;
        string[] images;
        decimal? latitude;
        decimal? longitude;
        string? address;
        string? district;
        string created_at;
        string status;
        string? updated_at;
    |}, sql:Error?> resultStream = dbClient->query(selectQuery);
    
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
        int user_id;
        string? district;
    |}[] reports = [];
    
    error? fromResult = from var row in resultStream
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
            }

            reports.push({
                id: row.id,
                user_id: row.user_id,
                title: row.title,
                description: row.description,
                hazard_type: row.hazard_type,
                severity_level: row.severity_level,
                images: row.images,
                location: location,
                created_at: row.created_at,
                status: row.status,
                updated_at: row.updated_at,
                district: row.district
            });
        };
    
    if fromResult is error {
        return fromResult;
    }
    
    error? closeErr = resultStream.close();
    if closeErr is error {
        log:printError("Error closing result stream", closeErr);
    }
    
    return reports;
}

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
    string? district;
|}[]|error {
    
    sql:ParameterizedQuery baseQuery = `
        SELECT id, title, description, hazard_type, severity_level, images, 
               latitude, longitude, address, district, created_at, status, updated_at
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
    
    if fromLat is decimal && fromLng is decimal && toLat is decimal && toLng is decimal {
        baseQuery = sql:queryConcat(baseQuery, ` AND latitude BETWEEN ${fromLat} AND ${toLat}`);
        baseQuery = sql:queryConcat(baseQuery, ` AND longitude BETWEEN ${fromLng} AND ${toLng}`);
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
        string? district;
        string created_at;
        string status;
        string? updated_at;
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
        string? district;
    |}[] reports = [];
    
    error? fromResult = from var row in resultStream
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
                updated_at: row.updated_at,
                district: row.district
            });
        };
    
    if fromResult is error {
        return fromResult;
    }
    
    error? closeErr = resultStream.close();
    if closeErr is error {
        log:printError("Error closing result stream", closeErr);
    }
    
    return reports;
}

public function getReportDetails(int reportId) returns record {|
    int user_id;
    string hazard_type;
    string title;
|}|error {
    sql:ParameterizedQuery selectQuery = `
        SELECT user_id, hazard_type, title FROM hazard_reports WHERE id = ${reportId}
    `;
    
    stream<record {| int user_id; string hazard_type; string title; |}, sql:Error?> resultStream = dbClient->query(selectQuery);
    
    record {| record {| int user_id; string hazard_type; string title; |} value; |}|sql:Error? streamResult = check resultStream.next();
    
    error? closeErr = resultStream.close();
    if closeErr is error {
        log:printError("DATABASE: Error closing result stream: " + closeErr.message());
    }
    
    if streamResult is sql:Error {
        return error("SQL error: " + streamResult.message());
    }
    
    if streamResult is () {
        return error("Report not found");
    }
    
    return {
        user_id: streamResult.value.user_id,
        hazard_type: streamResult.value.hazard_type,
        title: streamResult.value.title
    };
}

public function updateHazardReport(
    int reportId,
    string title,
    string description,
    string hazardType,
    string severityLevel
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
|}|error {
    
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
        string? updated_at;
    |}, sql:Error?> resultStream = dbClient->query(updateQuery);
    
    record {| record {|
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
        string? updated_at;
    |} value; |}|sql:Error? streamResult = check resultStream.next();
    
    error? closeErr = resultStream.close();
    if closeErr is error {
        log:printError("Error closing result stream", closeErr);
    }
    
    if streamResult is record {| record {|
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
        string? updated_at;
    |} value; |} {
        record {|
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
            string? updated_at;
        |} row = streamResult.value;
        
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
        }

        log:printInfo("Report updated with ID: " + reportId.toString());
        return {
            id: row.id,
            title: row.title,
            description: row.description,
            hazard_type: row.hazard_type,
            severity_level: row.severity_level,
            images: row.images,
            location: location,
            created_at: row.created_at,
            status: row.status,
            updated_at: row.updated_at
        };
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

public function deleteOldReports() returns int|error {
    sql:ParameterizedQuery deleteQuery = `
        DELETE FROM hazard_reports 
        WHERE created_at < NOW() - INTERVAL '24 hours'
        AND hazard_type IN ('traffic', 'accident')
    `;
    
    sql:ExecutionResult result = check dbClient->execute(deleteQuery);
    
    int deletedCount = <int>result.affectedRowCount;
    if deletedCount > 0 {
        log:printInfo("Automatically deleted " + deletedCount.toString() + " traffic/accident reports older than 24 hours");
    }
    return deletedCount;
}

public function insertUser(
    string firstName,
    string lastName,
    string email,
    string passwordHash,
    decimal latitude,
    decimal longitude,
    string address,
    string? profileImage
) returns int|error {
    sql:ParameterizedQuery insertQuery = `
        INSERT INTO users (
            first_name, last_name, email, password_hash, 
            latitude, longitude, address, profile_image
        ) VALUES (
            ${firstName}, ${lastName}, ${email}, ${passwordHash},
            ${latitude}, ${longitude}, ${address}, ${profileImage}
        ) RETURNING id;
    `;
    
    stream<record {int id;}, sql:Error?> resultStream = dbClient->query(insertQuery);
    record {| record {int id;} value; |}|sql:Error? nextRow = check resultStream.next();
    error? closeErr = resultStream.close();
    
    if closeErr is error {
        log:printError("Error closing result stream", closeErr);
    }
    
    if nextRow is record {| record {int id;} value; |} {
        int id = nextRow.value.id;
        log:printInfo("User inserted with ID: " + id.toString());
        return id;
    } else {
        return error DatabaseError("Failed to retrieve inserted user ID");
    }
}

public function getUserByEmail(string email) returns User|error {
    sql:ParameterizedQuery selectQuery = `
        SELECT id, first_name, last_name, email, password_hash,
               latitude, longitude, address, 
               profile_image, created_at
        FROM users 
        WHERE email = ${email}
    `;
    
    stream<User, sql:Error?> resultStream = dbClient->query(selectQuery);
    record {| User value; |}|sql:Error? row = check resultStream.next();
    error? closeErr = resultStream.close();
    
    if closeErr is error {
        log:printError("Error closing result stream", closeErr);
    }
    
    if row is record {| User value; |} {
        return row.value;
    } else {
        return error DatabaseError("User not found");
    }
}

public function updateUser(int userId, User updatedUser) returns User|error {
    sql:ParameterizedQuery updateQuery = `
        UPDATE users 
        SET first_name = ${updatedUser.first_name},
            last_name = ${updatedUser.last_name},
            latitude = ${updatedUser.latitude},
            longitude = ${updatedUser.longitude},
            address = ${updatedUser.address},
            profile_image = ${updatedUser.profile_image}
        WHERE id = ${userId}
        RETURNING id, first_name, last_name, email, password_hash,
                  latitude, longitude, address, 
                  profile_image, created_at
    `;
    
    stream<User, sql:Error?> resultStream = dbClient->query(updateQuery);
    record {| User value; |}|sql:Error? row = check resultStream.next();
    error? closeErr = resultStream.close();
    
    if closeErr is error {
        log:printError("Error closing result stream", closeErr);
    }
    
    if row is record {| User value; |} {
        log:printInfo("User updated with ID: " + userId.toString());
        return row.value;
    } else {
        return error DatabaseError("User not found or update failed");
    }
}

public function getReportsByUserId(int userId) returns record {|
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
    int user_id;
    string? district;
|}[]|error {
    
    sql:ParameterizedQuery selectQuery = `
        SELECT id, user_id, title, description, hazard_type, severity_level, images, 
               latitude, longitude, address, district, created_at, status, updated_at
        FROM hazard_reports
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
    `;
    
    stream<record {|
        int id;
        int user_id;
        string title;
        string? description;
        string hazard_type;
        string severity_level;
        string[] images;
        decimal? latitude;
        decimal? longitude;
        string? address;
        string? district;
        string created_at;
        string status;
        string? updated_at;
    |}, sql:Error?> resultStream = dbClient->query(selectQuery);
    
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
        int user_id;
        string? district;
    |}[] reports = [];
    
    error? fromResult = from var row in resultStream
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
            }

            reports.push({
                id: row.id,
                user_id: row.user_id,
                title: row.title,
                description: row.description,
                hazard_type: row.hazard_type,
                severity_level: row.severity_level,
                images: row.images,
                location: location,
                created_at: row.created_at,
                status: row.status,
                updated_at: row.updated_at,
                district: row.district
            });
        };
    
    if fromResult is error {
        return fromResult;
    }
    
    error? closeErr = resultStream.close();
    if closeErr is error {
        log:printError("Error closing result stream", closeErr);
    }
    
    return reports;
}

public function getNearbyReports(decimal userLat, decimal userLng, decimal radiusKm) returns record {|
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
    int user_id;
    decimal distance_km;
|}[]|error {
    
    sql:ParameterizedQuery selectQuery = `
        SELECT id, user_id, title, description, hazard_type, severity_level, images, 
               latitude, longitude, address, created_at, status, updated_at,
               (6371 * acos(cos(radians(${userLat})) * cos(radians(latitude)) * 
               cos(radians(longitude) - radians(${userLng})) + 
               sin(radians(${userLat})) * sin(radians(latitude)))) as distance_km
        FROM hazard_reports
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND status IN ('active', 'pending', 'confirmed')
        HAVING distance_km <= ${radiusKm}
        ORDER BY distance_km ASC, created_at DESC
    `;

    stream<record {|
        int id;
        int user_id;
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
        string? updated_at;
        decimal distance_km;
    |}, sql:Error?> resultStream = dbClient->query(selectQuery);
    
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
        int user_id;
        decimal distance_km;
    |}[] reports = [];
    
    error? fromResult = from var row in resultStream
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
            }

            reports.push({
                id: row.id,
                user_id: row.user_id,
                title: row.title,
                description: row.description,
                hazard_type: row.hazard_type,
                severity_level: row.severity_level,
                images: row.images,
                location: location,
                created_at: row.created_at,
                status: row.status,
                updated_at: row.updated_at,
                distance_km: row.distance_km
            });
        };
    
    if fromResult is error {
        return fromResult;
    }
    
    error? closeErr = resultStream.close();
    if closeErr is error {
        log:printError("Error closing result stream", closeErr);
    }
    
    return reports;
}

public function getReportType(int reportId) returns string|error {
    sql:ParameterizedQuery selectQuery = `
        SELECT hazard_type FROM hazard_reports WHERE id = ${reportId}
    `;
    
    stream<record {| string hazard_type; |}, sql:Error?> resultStream = dbClient->query(selectQuery);
    
    record {| record {| string hazard_type; |} value; |}|sql:Error? streamResult = check resultStream.next();
    
    error? closeErr = resultStream.close();
    if closeErr is error {
        log:printError("DATABASE: Error closing result stream: " + closeErr.message());
    }
    
    if streamResult is sql:Error {
        return error("SQL error: " + streamResult.message());
    }
    
    if streamResult is () {
        return error("Report not found");
    }
    
    return streamResult.value.hazard_type;
}

public function resolveHazardReport(int reportId, int resolvedByUserId) returns boolean|error {
    log:printInfo("DATABASE: resolveHazardReport called - Report ID: " + reportId.toString() + ", User ID: " + resolvedByUserId.toString());
    
    sql:ParameterizedQuery selectQuery = `
        SELECT user_id, title, description, hazard_type, severity_level, images, 
               latitude, longitude, address, district, created_at
        FROM hazard_reports 
        WHERE id = ${reportId}
    `;
    
    log:printInfo("DATABASE: Executing select query for report: " + reportId.toString());
    
    stream<record {|
        int user_id;
        string title;
        string? description;
        string hazard_type;
        string severity_level;
        string[] images;
        decimal? latitude;
        decimal? longitude;
        string? address;
        string? district;
        string created_at;
    |}, sql:Error?> resultStream = dbClient->query(selectQuery);
    
    record {| record {|
        int user_id;
        string title;
        string? description;
        string hazard_type;
        string severity_level;
        string[] images;
        decimal? latitude;
        decimal? longitude;
        string? address;
        string? district;
        string created_at;
    |} value; |}|sql:Error? streamResult = check resultStream.next();
    
    error? closeErr = resultStream.close();
    if closeErr is error {
        log:printError("DATABASE: Error closing result stream: " + closeErr.message());
    }
    
    if streamResult is sql:Error {
        log:printError("DATABASE: SQL error finding report: " + streamResult.message());
        return error("Report not found (SQL error): " + streamResult.message());
    }
    
    if streamResult is () {
        log:printError("DATABASE: Report not found with ID: " + reportId.toString());
        return error("Report not found");
    }
    
    log:printInfo("DATABASE: Report found: " + streamResult.value.title);
    
    record {|
        int user_id;
        string title;
        string? description;
        string hazard_type;
        string severity_level;
        string[] images;
        decimal? latitude;
        decimal? longitude;
        string? address;
        string? district;
        string created_at;
    |} report = streamResult.value;
    
    log:printInfo("DATABASE: Inserting into resolved_hazard_reports...");
    
    sql:ParameterizedQuery insertQuery = `
        INSERT INTO resolved_hazard_reports (
            original_report_id, user_id, title, description, hazard_type, 
            severity_level, images, latitude, longitude, address, district, created_at, resolved_by
        ) VALUES (
            ${reportId}, ${report.user_id}, ${report.title}, ${report.description}, 
            ${report.hazard_type}, ${report.severity_level}, ${report.images}, 
            ${report.latitude}, ${report.longitude}, ${report.address}, ${report.district},
            ${report.created_at}::timestamp, ${resolvedByUserId}
        )
    `;
    
    sql:ExecutionResult|error insertResult = dbClient->execute(insertQuery);
    if insertResult is error {
        log:printError("DATABASE: Insert error: " + insertResult.toString());
        return error("Failed to insert resolved report: " + insertResult.message());
    }
    
    log:printInfo("DATABASE: Insert result - Affected rows: " + insertResult.affectedRowCount.toString());
    
    if insertResult.affectedRowCount < 1 {
        log:printError("DATABASE: No rows inserted");
        return error("Failed to insert resolved report");
    }
    
    log:printInfo("DATABASE: Deleting from hazard_reports...");
    
    sql:ParameterizedQuery deleteQuery = `
        DELETE FROM hazard_reports WHERE id = ${reportId}
    `;
    
    sql:ExecutionResult deleteResult = check dbClient->execute(deleteQuery);
    log:printInfo("DATABASE: Delete result - Affected rows: " + deleteResult.affectedRowCount.toString());
    
    if deleteResult.affectedRowCount < 1 {
        log:printError("DATABASE: Failed to delete original report");
        return error("Failed to delete original report");
    }
    
    log:printInfo("DATABASE: Report successfully resolved and moved - ID: " + reportId.toString());
    return true;
}

public function getResolvedReports() returns record {|
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
    string resolved_at;
    int original_report_id;
    string? district;
|}[]|error {
    
    sql:ParameterizedQuery selectQuery = `
        SELECT id, original_report_id, title, description, hazard_type, severity_level, 
               images, latitude, longitude, address, district, created_at, resolved_at
        FROM resolved_hazard_reports
        ORDER BY resolved_at DESC
    `;
    
    stream<record {|
        int id;
        int original_report_id;
        string title;
        string? description;
        string hazard_type;
        string severity_level;
        string[] images;
        decimal? latitude;
        decimal? longitude;
        string? address;
        string? district;
        string created_at;
        string resolved_at;
    |}, sql:Error?> resultStream = dbClient->query(selectQuery);
    
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
        string resolved_at;
        int original_report_id;
        string? district;
    |}[] reports = [];
    
    error? fromResult = from var row in resultStream
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
            }

            reports.push({
                id: row.id,
                original_report_id: row.original_report_id,
                title: row.title,
                description: row.description,
                hazard_type: row.hazard_type,
                severity_level: row.severity_level,
                images: row.images,
                location: location,
                created_at: row.created_at,
                resolved_at: row.resolved_at,
                district: row.district
            });
        };
    
    if fromResult is error {
        return fromResult;
    }
    
    error? closeErr = resultStream.close();
    if closeErr is error {
        log:printError("Error closing result stream", closeErr);
    }
    
    return reports;
}