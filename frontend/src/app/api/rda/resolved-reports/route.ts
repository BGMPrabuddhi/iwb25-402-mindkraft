// src/app/api/rda/resolved-reports/route.ts
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

    console.log('🔄 RDA API: Fetching resolved reports...');
    
    const response = await fetch('http://localhost:8080/api/resolved-reports', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    const data = await response.json();
    console.log('✅ RDA API: Resolved reports fetched:', data);

    return NextResponse.json(data, { status: response.status });

  } catch (error: unknown) {
    console.error('❌ Resolved reports API error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error occurred while fetching resolved reports',
      errorCode: 'internal_error'
    }, { status: 500 });
  }
}