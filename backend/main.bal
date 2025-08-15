import ballerina/http;
import ballerina/log;
import ballerina/sql;
import ballerinax/postgresql;

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

type HazardReportPayload record {|
    string title;
    string description?;
    string hazard_type;
    string severity_level;
|};

function insertHazardReport(
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

service /api on new http:Listener(8080) {
    resource function get health() returns json|error {
        stream<record{}, sql:Error?> resultStream = check dbClient->query(`SELECT 1`);
        sql:Error? err = resultStream.close();
        if err is sql:Error {
            log:printError("Database connection test failed", err);
            return {"status": "error", "message": "Database connection failed"};
        }
        log:printInfo("Database connection test successful");
        return {"status": "ok", "message": "Database connected successfully"};
    }

    resource function options reports(http:Caller caller, http:Request req) returns error? {
        http:Response res = new;
        res.statusCode = 200;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        check caller->respond(res);
    }

    resource function post reports(http:Caller caller, http:Request req) returns error? {
        json|error body = req.getJsonPayload();
        if body is json {
            log:printInfo("Received JSON: " + body.toString());
        }
        
        http:Response res = new;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        
        if body is error {
            res.setPayload({"status": "error", "message": "Invalid JSON payload"});
            check caller->respond(res);
            return;
        }
        
        // Safe field extraction
        map<json> jsonMap = <map<json>>body;
        
        json titleJson = jsonMap["title"] ?: ();
        json hazardTypeJson = jsonMap["hazard_type"] ?: ();
        json severityJson = jsonMap["severity_level"] ?: ();
        json descriptionJson = jsonMap["description"] ?: ();
        
        if titleJson is () || hazardTypeJson is () || severityJson is () {
            res.setPayload({"status": "error", "message": "Missing required fields: title, hazard_type, severity_level"});
            check caller->respond(res);
            return;
        }
        
        string title = titleJson.toString();
        string hazardType = hazardTypeJson.toString();
        string severityLevel = severityJson.toString();
        string description = descriptionJson != () ? descriptionJson.toString() : "";
        
        int|error dbResult = insertHazardReport(
            dbClient,
            title,
            description,
            hazardType,
            severityLevel
        );
        
        if dbResult is int {
            res.setPayload({"status": "success", "message": "Report submitted successfully", "report_id": dbResult});
            check caller->respond(res);
        } else {
            res.setPayload({"status": "error", "message": dbResult.toString()});
            check caller->respond(res);
        }
    }
}