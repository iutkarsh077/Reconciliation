import { NextResponse } from 'next/server';

export function proxy(request) {
  const token = request.cookies.get('github_token')?.value;
  const pathname = request.nextUrl.pathname.replace(/\/+$/, '') || '/';

  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!token && pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: ['/', '/login', '/login/:path*'],
};