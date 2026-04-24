import { NextRequest, NextResponse } from "next/server";

function isAuthenticated(request: NextRequest) {
  return request.cookies.get("cmms-auth")?.value === "1";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = isAuthenticated(request);
  const isLoginRoute = pathname === "/login";
  const isSelectCompanyRoute = pathname === "/select-company";
  const hasActiveCompany = Boolean(request.cookies.get("cmms-company")?.value);

  if (!authenticated && !isLoginRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (authenticated && isLoginRoute) {
    const nextUrl = new URL(hasActiveCompany ? "/dashboard" : "/select-company", request.url);
    return NextResponse.redirect(nextUrl);
  }

  if (authenticated && isSelectCompanyRoute && hasActiveCompany) {
    const dashboardUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"]
};
