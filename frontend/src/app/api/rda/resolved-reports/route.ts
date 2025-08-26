import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('API ROUTE: GET resolved reports called');
  
  try {
    const authHeader = request.headers.get('authorization');
    console.log('API ROUTE: Auth header for resolved reports:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Authorization token required',
        errorCode: 'no_token'
      }, { status: 401 });
    }

    const response = await fetch('http://localhost:8080/api/resolved-reports', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    console.log('API ROUTE: Resolved reports backend response:', response.status);
    
    const data = await response.json();
    console.log('API ROUTE: Resolved reports data:', data);

    return NextResponse.json(data, { status: response.status });

  } catch (error: unknown) {
    console.error('API ROUTE: Resolved reports error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error occurred while fetching resolved reports',
      errorCode: 'internal_error'
    }, { status: 500 });
  }
}