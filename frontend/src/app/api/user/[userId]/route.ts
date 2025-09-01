import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('Authorization');
    console.log('✅ Proxy: Fetching user details for ID:', params.userId);
    console.log('✅ Proxy: Auth header present:', !!authHeader);

    if (!authHeader) {
      return NextResponse.json({
        success: false,
        message: 'Authorization header is required',
        errorCode: 'missing_auth'
      }, { status: 401 });
    }

    // Forward the request to the backend
    const response = await fetch(`http://localhost:8080/api/user/${params.userId}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('✅ Proxy: User details response:', data);

    return NextResponse.json(data, { status: response.status });

  } catch (error: unknown) {
    console.error('❌ User details API error:', error);
    
    // Handle different types of errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json({
        success: false,
        message: 'Unable to connect to backend service',
        errorCode: 'backend_connection_error'
      }, { status: 503 });
    }

    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      errorCode: 'internal_error'
    }, { status: 500 });
  }
}
