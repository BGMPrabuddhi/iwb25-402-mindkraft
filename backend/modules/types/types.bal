public type LocationPayload record {
    decimal lat;
    decimal lng;
    string? address;
};

public type Location record {
    decimal lat;
    decimal lng;
    string? address;
};

public type HazardReport record {
    int id;
    string title;
    string? description;
    string hazard_type;
    string severity_level;
    string status;
    string[] images;
    Location? location;
    string created_at;
    string? updated_at;
};

public type HazardReportPayload record {
    string title;
    string? description;
    string hazard_type;
    string severity_level;
    string[]? images;
    LocationPayload? location;
};

public type ApiResponse record {
    string status;
    string message;
    int? report_id;
    int? images_uploaded;
    string[]? image_urls;
};

public type ReportsResponse record {
    string status;
    string message;
    HazardReport[] reports;
};

public type UpdateReportPayload record {
    string? title;
    string? description;
    string? hazard_type;
    string? severity_level;
};

public type UpdateReportResponse record {
    string status;
    string message;
    HazardReport data;
};

public type DeleteReportResponse record {
    string status;
    string message;
};