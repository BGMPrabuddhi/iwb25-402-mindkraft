import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if accessing RDA dashboard
  if (request.nextUrl.pathname.startsWith('/rda-dashboard')) {
    // Check for token in localStorage (this won't work in middleware)
    // So we'll rely on the component-level check
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/rda-dashboard/:path*']
}