// app/api/rda/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Authorization token required',
        errorCode: 'no_token'
      }, { status: 401 });
    }

    console.log('🔄 RDA API: Fetching reports for RDA dashboard...');
    
    // Forward to backend RDA endpoint with authentication
    const response = await fetch('http://localhost:8080/api/rda/reports', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': authHeader
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ RDA API: Reports fetched:', data);

    return NextResponse.json(data);

  } catch (error: unknown) {
    console.error('❌ RDA reports API error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error occurred while fetching reports',
      errorCode: 'internal_error'
    }, { status: 500 });
  }
}