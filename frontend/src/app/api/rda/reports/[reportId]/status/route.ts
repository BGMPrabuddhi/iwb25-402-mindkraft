import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { reportId: string } }
): Promise<NextResponse> {
  console.log('API ROUTE: PUT status endpoint called');
  console.log('API ROUTE: Params:', params);
  
  try {
    const authHeader = request.headers.get('authorization');
    console.log('API ROUTE: Auth header exists:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('API ROUTE: Missing or invalid auth header');
      return NextResponse.json({
        success: false,
        message: 'Authorization token required',
        errorCode: 'no_token'
      }, { status: 401 });
    }

    const { reportId } = params;
    const body = await request.json();
    
    console.log('API ROUTE: Report ID:', reportId);
    console.log('API ROUTE: Request body:', body);

    const backendUrl = `http://localhost:8080/api/reports/${reportId}`;
    console.log('API ROUTE: Making request to backend:', backendUrl);
    
    const response = await fetch(backendUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
      body: JSON.stringify(body)
    });

    console.log('API ROUTE: Backend response status:', response.status);
    console.log('API ROUTE: Backend response ok:', response.ok);
    
    const data = await response.json();
    console.log('API ROUTE: Backend response data:', data);

    return NextResponse.json(data, { status: response.status });

  } catch (error: unknown) {
    console.error('API ROUTE: Error in status update:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error occurred while updating report status',
      errorCode: 'internal_error'
    }, { status: 500 });
  }
}