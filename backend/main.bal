import ballerina/http;
import ballerina/log;

service /api on new http:Listener(8080) {
    
    resource function get health() returns json|error {
        error? testResult = testConnection();
        if testResult is error {
            log:printError("Database connection failed", testResult);
            return {"status": "error", "message": "Database connection failed"};
        }
        return {"status": "ok", "message": "Database connected successfully"};
    }
}