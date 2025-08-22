// app/api/rda/reports/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: 'Authorization token required',
        errorCode: 'no_token'
      }, { status: 401 });
    }

    const { status } = await request.json();
    const reportId = params.id;

    if (!status || !['active', 'in_progress', 'resolved'].includes(status)) {
      return NextResponse.json({
        success: false,
        message: 'Valid status required (active, in_progress, resolved)',
        errorCode: 'invalid_status'
      }, { status: 400 });
    }

    console.log(`🔄 RDA API: Updating report ${reportId} status to ${status}...`);
    
    // Forward to backend to update report status
    const response = await fetch(`http://localhost:8080/api/reports/${reportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        status: status
      }),
    });

    const data = await response.json();
    console.log('✅ RDA API: Report status updated:', data);

    return NextResponse.json(data, { status: response.status });

  } catch (error: unknown) {
    console.error('❌ RDA status update API error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error occurred while updating report status',
      errorCode: 'internal_error'
    }, { status: 500 });
  }
}