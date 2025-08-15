public type LocationPayload record {
    decimal lat;
    decimal lng;
    string? address;
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