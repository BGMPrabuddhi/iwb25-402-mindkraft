import ballerina/log;

// Sri Lankan districts with their approximate bounding boxes (lat/lng coordinates)
// This is a simplified version - in production, you would use proper geographic data
type DistrictBounds record {
    string name;
    decimal minLat;
    decimal maxLat;
    decimal minLng;
    decimal maxLng;
};

// Approximate bounding boxes for Sri Lankan districts
// These are simplified boundaries - for production use, consider using proper GIS libraries
final DistrictBounds[] DISTRICT_BOUNDS = [
    {name: "Colombo", minLat: 6.8, maxLat: 7.0, minLng: 79.8, maxLng: 80.0},
    {name: "Gampaha", minLat: 6.9, maxLat: 7.2, minLng: 79.9, maxLng: 80.2},
    {name: "Kalutara", minLat: 6.4, maxLat: 6.8, minLng: 79.8, maxLng: 80.2},
    {name: "Kandy", minLat: 7.1, maxLat: 7.5, minLng: 80.4, maxLng: 80.8},
    {name: "Matale", minLat: 7.3, maxLat: 7.7, minLng: 80.5, maxLng: 80.9},
    {name: "Nuwara Eliya", minLat: 6.8, maxLat: 7.2, minLng: 80.6, maxLng: 81.1},
    {name: "Galle", minLat: 5.9, maxLat: 6.4, minLng: 80.0, maxLng: 80.4},
    {name: "Matara", minLat: 5.8, maxLat: 6.2, minLng: 80.4, maxLng: 80.8},
    {name: "Hambantota", minLat: 6.0, maxLat: 6.5, minLng: 80.8, maxLng: 81.4},
    {name: "Jaffna", minLat: 9.4, maxLat: 9.8, minLng: 79.8, maxLng: 80.2},
    {name: "Kilinochchi", minLat: 9.2, maxLat: 9.6, minLng: 80.2, maxLng: 80.6},
    {name: "Mannar", minLat: 8.7, maxLat: 9.2, minLng: 79.6, maxLng: 80.2},
    {name: "Mullaitivu", minLat: 9.0, maxLat: 9.4, minLng: 80.6, maxLng: 81.2},
    {name: "Vavuniya", minLat: 8.6, maxLat: 9.0, minLng: 80.2, maxLng: 80.8},
    {name: "Anuradhapura", minLat: 8.2, maxLat: 8.6, minLng: 80.2, maxLng: 80.8},
    {name: "Polonnaruwa", minLat: 7.7, maxLat: 8.2, minLng: 80.8, maxLng: 81.4},
    {name: "Kurunegala", minLat: 7.3, maxLat: 7.8, minLng: 80.0, maxLng: 80.6},
    {name: "Puttalam", minLat: 7.8, maxLat: 8.4, minLng: 79.6, maxLng: 80.2},
    {name: "Kegalle", minLat: 7.0, maxLat: 7.4, minLng: 80.1, maxLng: 80.5},
    {name: "Ratnapura", minLat: 6.5, maxLat: 7.0, minLng: 80.2, maxLng: 80.8},
    {name: "Trincomalee", minLat: 8.2, maxLat: 8.8, minLng: 80.8, maxLng: 81.4},
    {name: "Batticaloa", minLat: 7.5, maxLat: 8.1, minLng: 81.4, maxLng: 81.8},
    {name: "Ampara", minLat: 6.8, maxLat: 7.5, minLng: 81.4, maxLng: 81.9},
    {name: "Badulla", minLat: 6.7, maxLat: 7.2, minLng: 80.8, maxLng: 81.4},
    {name: "Monaragala", minLat: 6.2, maxLat: 6.8, minLng: 81.0, maxLng: 81.6}
];

// Function to determine district from coordinates
public function getDistrictFromCoordinates(decimal lat, decimal lng) returns string? {
    log:printInfo("LOCATION: Determining district for coordinates: " + lat.toString() + ", " + lng.toString());
    
    // Check if coordinates are within Sri Lanka's approximate bounds
    decimal minLat = 5.8d;
    decimal maxLat = 9.8d;
    decimal minLng = 79.6d;
    decimal maxLng = 81.9d;
    
    if lat < minLat || lat > maxLat || lng < minLng || lng > maxLng {
        log:printWarn("LOCATION: Coordinates outside Sri Lanka bounds");
        return ();
    }
    
    // Find matching district
    foreach DistrictBounds district in DISTRICT_BOUNDS {
        if lat >= district.minLat && lat <= district.maxLat && 
           lng >= district.minLng && lng <= district.maxLng {
            log:printInfo("LOCATION: Found district: " + district.name);
            return district.name;
        }
    }
    
    // If no exact match found, find the closest district
    string? closestDistrict = findClosestDistrict(lat, lng);
    if closestDistrict is string {
        log:printInfo("LOCATION: Using closest district: " + closestDistrict);
        return closestDistrict;
    }
    
    log:printWarn("LOCATION: Could not determine district for coordinates");
    return ();
}

// Function to find the closest district when coordinates don't fall within any exact bounds
function findClosestDistrict(decimal lat, decimal lng) returns string? {
    string? closestDistrict = ();
    decimal minDistance = 999999.0;
    
    foreach DistrictBounds district in DISTRICT_BOUNDS {
        // Calculate distance to district center
        decimal centerLat = (district.minLat + district.maxLat) / 2;
        decimal centerLng = (district.minLng + district.maxLng) / 2;
        
        decimal distance = calculateDistance(lat, lng, centerLat, centerLng);
        
        if distance < minDistance {
            minDistance = distance;
            closestDistrict = district.name;
        }
    }
    
    return closestDistrict;
}

// Simple distance calculation (simplified for basic comparison)
// In production, you might want to use a proper geodesic distance calculation
function calculateDistance(decimal lat1, decimal lng1, decimal lat2, decimal lng2) returns decimal {
    decimal latDiff = lat1 - lat2;
    decimal lngDiff = lng1 - lng2;
    // Use absolute value of differences for simple distance comparison
    decimal absLatDiff = latDiff < 0d ? -latDiff : latDiff;
    decimal absLngDiff = lngDiff < 0d ? -lngDiff : lngDiff;
    return absLatDiff + absLngDiff; // Manhattan distance approximation
}

// Function to extract district from address as fallback
public function extractDistrictFromAddress(string? address) returns string? {
    if address is () || address.trim() == "" {
        return ();
    }
    
    string addressLower = address.toLowerAscii();
    
    // List of Sri Lankan districts
    string[] districts = [
        "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo",
        "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara",
        "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar",
        "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya",
        "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
    ];
    
    foreach string district in districts {
        if addressLower.includes(district.toLowerAscii()) {
            log:printInfo("LOCATION: Extracted district from address: " + district);
            return district;
        }
    }
    
    return ();
}
