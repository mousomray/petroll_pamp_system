import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loginToken = request.cookies.get("login-token")?.value;

  console.log("Middleware running for:", pathname);

  const secret = new TextEncoder().encode(process.env.TOKEN_SECRET);

  if (pathname === "/login") {
    if (!loginToken) {
      return NextResponse.next();
    }

    try {
      await jwtVerify(loginToken, secret);
      return NextResponse.redirect(new URL("/profile", request.url));
    } catch {
      return NextResponse.next();
    }
  }

  if (pathname === "/profile") {
    if (!loginToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      await jwtVerify(loginToken, secret);
      return NextResponse.next();
    } catch {
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.set("login-token", "", { maxAge: 0, path: "/" });
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/profile", "/login"], 
};