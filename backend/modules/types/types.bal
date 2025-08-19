import ballerina/time;

# Location data structure
public type Location record {|
    # Latitude coordinate
    decimal lat;
    # Longitude coordinate  
    decimal lng;
    # Human readable address
    string? address?;
|};

# Legacy type for compatibility
public type LocationPayload record {|
    # Latitude coordinate
    decimal lat;
    # Longitude coordinate
    decimal lng;
    # Human readable address
    string? address?;
|};

# Hazard report payload for creation
public type HazardReportPayload record {|
    # Title of the hazard report
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
    # Detailed description of the hazard
    string? description?;
    # Type of hazard
    string hazard_type;
    # Severity level
    string severity_level;
    # Array of image filenames
    string[]? images?;
    # Location information
    Location? location?;
|};

# Complete hazard report record
public type HazardReport record {|
    # Unique identifier
    int id;
    # Title of the hazard report
    string title;
    # Detailed description of the hazard
    string? description?;
    # Type of hazard
    string hazard_type;
    # Severity level
    string severity_level;
    # Current status
    string status;
    # Array of image filenames
    string[] images;
    # Location information
    Location? location?;
    # Creation timestamp
    string created_at;
    # Last update timestamp
    string? updated_at?;
|};

# API response for submission
public type ApiResponse record {|
    # Response status
    string status;
    # Response message
    string message;
    # Created report ID
    int? report_id?;
    # Number of images uploaded
    int? images_uploaded?;
    # URLs of uploaded images
    string[]? image_urls?;
|};

# Response for getting multiple reports
public type HazardReportsListResponse record {|
    # Array of hazard reports
    HazardReport[] reports;
    # Total number of reports
    int total_count;
    # Current page number
    int page;
    # Page size
    int page_size;
    # Response timestamp
    string timestamp;
    # Applied filters
    record {|
        # Hazard type filter
        string? hazard_type?;
        # Severity filter
        string? severity?;
        # Status filter
        string? status?;
    |} filters_applied;
    # Pagination information
    record {|
        # Current page
        int current_page;
        # Page size
        int page_size;
        # Whether there are more pages
        boolean has_more;
    |} pagination;
|};

# Update payload
public type UpdateReportPayload record {|
    # Updated title
    string? title?;
    # Updated description
    string? description?;
    # Updated hazard type
    string? hazard_type?;
    # Updated severity level
    string? severity_level?;
    # Updated status
    string? status?;
|};

# Database record structure
public type DbHazardReport record {|
    # Unique identifier
    int id;
    # Title of the hazard report
    string title;
    # Detailed description
    string? description?;
    # Type of hazard
    string hazard_type;
    # Severity level
    string severity_level;
    # Current status
    string status;
    # Array of image filenames
    string[] images;
    # Latitude coordinate
    float? latitude?;
    # Longitude coordinate
    float? longitude?;
    # Human readable address
    string? address?;
    # Creation timestamp
    time:Civil created_at;
    # Last update timestamp
    time:Civil? updated_at?;
|};
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
