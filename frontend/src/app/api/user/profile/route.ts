import { NextRequest, NextResponse } from 'next/server';

// Types for the update profile request
interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  location?: string;
  profileImage?: string; // Base64 encoded image
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Authorization token required',
        errorCode: 'no_token'
      }, { status: 401 });
    }

    // Parse the request body
    const body: UpdateProfileRequest = await request.json();
    
    // Validate required fields
    if (!body.firstName || !body.lastName) {
      return NextResponse.json({
        success: false,
        message: 'First name and last name are required',
        errorCode: 'missing_fields'
      }, { status: 400 });
    }

    console.log('🔄 Proxy: Forwarding profile update to backend...');
    
    // Forward the request to the Ballerina backend using the same endpoint as getProfile
    const response = await fetch('http://localhost:8080/api/me', {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('✅ Proxy: Profile update response:', data);

    return NextResponse.json(data, { status: response.status });

  } catch (error: unknown) {
    console.error('❌ Profile update API error:', error);
    
    // Handle different types of errors
    if (error instanceof SyntaxError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid JSON in request body',
        errorCode: 'invalid_json'
      }, { status: 400 });
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json({
        success: false,
        message: 'Unable to connect to backend service',
        errorCode: 'backend_unavailable'
      }, { status: 503 });
    }

    // Generic error response
    return NextResponse.json({
      success: false,
      message: 'Internal server error occurred while updating profile',
      errorCode: 'internal_error'
    }, { status: 500 });
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
