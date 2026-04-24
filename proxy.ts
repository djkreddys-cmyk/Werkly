import { NextRequest, NextResponse } from "next/server";

const ADMIN_HOST = "admin.werkly.in";

export function proxy(request: NextRequest) {
  const { nextUrl } = request;
  const host = request.headers.get("host") || "";
  const isLocalHost =
    host.includes("localhost") || host.startsWith("127.0.0.1");
  const isAdminHost = host.startsWith(ADMIN_HOST);
  const isAdminPath = nextUrl.pathname.startsWith("/admin");
  const isAdminLoginPath = nextUrl.pathname.startsWith("/admin/login");
  const hasAdminSession = request.cookies.get("werklyAdminSession")?.value === "1";

  if (isLocalHost) {
    return NextResponse.next();
  }

  if (!isAdminHost && isAdminPath) {
    const redirectUrl = new URL(nextUrl.pathname + nextUrl.search, `https://${ADMIN_HOST}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminHost && nextUrl.pathname === "/") {
    const redirectUrl = new URL("/admin/login", `https://${ADMIN_HOST}`);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminHost && isAdminPath && !isAdminLoginPath && !hasAdminSession) {
    const redirectUrl = new URL("/admin/login", `https://${ADMIN_HOST}`);
    redirectUrl.searchParams.set("redirect", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminHost && isAdminLoginPath && hasAdminSession) {
    const redirectUrl = new URL("/admin", `https://${ADMIN_HOST}`);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
