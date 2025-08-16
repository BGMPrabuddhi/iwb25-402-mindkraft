import { NextRequest, NextResponse } from 'next/server';

// Get user profile
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authorization header required', errorCode: 'unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Proxy: Forwarding profile request to backend...');
    
    const response = await fetch('http://localhost:8080/api/me', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('✅ Proxy: Profile response:', data);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Unable to connect to backend server',
        errorCode: 'proxy_error'
      }, 
      { status: 500 }
    );
  }
}

// Update user profile
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authorization header required', errorCode: 'unauthorized' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.firstName || !body.lastName) {
      return NextResponse.json({
        success: false,
        message: 'First name and last name are required',
        errorCode: 'missing_fields'
      }, { status: 400 });
    }

    console.log('🔄 Proxy: Forwarding profile update to backend...');
    
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
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Unable to connect to backend server',
        errorCode: 'proxy_error'
      }, 
      { status: 500 }
    );
  }
}
