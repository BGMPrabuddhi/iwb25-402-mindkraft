import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔄 Forgot password API route called with:', { email: body.email });

    // Forward request to Ballerina backend
    const backendResponse = await fetch('http://localhost:8080/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json();
    
    console.log('✅ Backend response:', data);

    return NextResponse.json(data, {
      status: backendResponse.ok ? 200 : 400,
    });

  } catch (error) {
    console.error('❌ Forgot password API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        errorCode: 'server_error'
      },
      { status: 500 }
    );
  }
}
