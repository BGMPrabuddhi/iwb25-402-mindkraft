import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authorization header required', errorCode: 'unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Proxy: Forwarding home request to backend...');
    
    const response = await fetch('http://localhost:8080/api/home', {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('✅ Proxy: Home response:', data);

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
