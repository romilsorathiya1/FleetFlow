import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Role-based access control map
// Each route maps to the roles allowed to access it
const ROLE_ACCESS = {
    '/dashboard': ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'],
    '/vehicles': ['fleet_manager', 'dispatcher', 'safety_officer'],
    '/trips': ['fleet_manager', 'dispatcher'],
    '/maintenance': ['fleet_manager', 'safety_officer'],
    '/fuel-logs': ['fleet_manager', 'financial_analyst'],
    '/drivers': ['fleet_manager', 'safety_officer', 'dispatcher'],
    '/analytics': ['fleet_manager', 'financial_analyst'],
};

export async function middleware(request) {
    const { pathname } = request.nextUrl;

    // Skip auth for public routes, API routes (they handle their own auth), and static files
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/api/') ||
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/favicon') ||
        pathname === '/'
    ) {
        return NextResponse.next();
    }

    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    // Redirect unauthenticated users to login
    if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Check role-based access
    const matchedRoute = Object.keys(ROLE_ACCESS).find((route) =>
        pathname.startsWith(route)
    );

    if (matchedRoute) {
        const allowedRoles = ROLE_ACCESS[matchedRoute];
        if (!allowedRoles.includes(token.role)) {
            const dashboardUrl = new URL('/dashboard', request.url);
            dashboardUrl.searchParams.set('error', 'unauthorized');
            return NextResponse.redirect(dashboardUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/vehicles/:path*',
        '/trips/:path*',
        '/maintenance/:path*',
        '/fuel-logs/:path*',
        '/drivers/:path*',
        '/analytics/:path*',
    ],
};
