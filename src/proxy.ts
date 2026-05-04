import { NextRequest, NextResponse } from "next/server";

const PRIMARY_DOMAIN = "knowyoursubstance.com";
const WWW_DOMAIN = `www.${PRIMARY_DOMAIN}`;

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const host = request.headers.get("host")?.toLowerCase();

  if (host === WWW_DOMAIN) {
    const url = request.nextUrl.clone();
    url.hostname = PRIMARY_DOMAIN;
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/:path*",
};