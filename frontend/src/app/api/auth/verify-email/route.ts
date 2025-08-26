import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Proxy: Forwarding email verification request to backend...');
    
    const response = await fetch('http://localhost:8080/api/auth/verify-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log('Proxy: Backend responded:', data);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
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