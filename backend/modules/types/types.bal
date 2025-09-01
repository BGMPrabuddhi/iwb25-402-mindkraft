public type Location record {|
    decimal lat;
    decimal lng;
    string? address?;
|};

public type HazardReport record {|
    int id;
    string title;
    string? description?;
    string hazard_type;
    string severity_level;
    string status;
    string[] images;
    Location? location?;
    string created_at;
    string? updated_at?;
    // Reporter metadata
    string? reporter_first_name?;
    string? reporter_last_name?;
    string? reporter_profile_image?;
    // Additional fields
    string? district?;
    map<json>? submittedBy?;
|};

public type HazardReportPayload record {|
    string title;
    string? description?;
    string hazard_type;
    string severity_level;
    string[]? images?;
    Location? location?;
|};

public type ApiResponse record {|
    string status;
    string message;
    int? report_id?;
    int? images_uploaded?;
    string[]? image_urls?;
    string? timestamp?;
|};

public type ReportsResponse record {|
    string status;
    string message;
    HazardReport[] reports;
|};

public type UpdateReportPayload record {|
    string? title?;
    string? description?;
    string? hazard_type?;
    string? severity_level?;
    string? status?;
|};

public type UpdateReportResponse record {|
    string status;
    string message;
    HazardReport data;
|};

public type DeleteReportResponse record {|
    string status;
    string message;
|};

public enum HazardType {
    POTHOLE = "pothole",
    ROAD_DAMAGE = "road_damage",
    TRAFFIC_LIGHT = "traffic_light",
    CONSTRUCTION = "construction",
    ACCIDENT = "accident",
    WEATHER = "weather",
    OTHER = "other"
}

public enum SeverityLevel {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}

public enum ReportStatus {
    PENDING = "pending",
    VERIFIED = "verified",
    IN_PROGRESS = "in_progress",
    RESOLVED = "resolved",
    REJECTED = "rejected"
}