import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/auth";

const protectedRoutes = [
  "/dashboard",
  "/agenda",
  "/setores",
  "/usuarios",
  "/fornecedores",
  "/protocolos",
  "/contratos",
  "/licitacoes",
  "/configuracoes",
  "/relatorios",
];

type ProxyRequest = NextRequest & {
  auth?: {
    user?: {
      email?: string | null;
    };
  } | null;
};

export const proxy = auth((request: ProxyRequest) => {
  const { pathname } = request.nextUrl;
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  if (!request.auth?.user?.email) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/agenda/:path*",
    "/setores/:path*",
    "/usuarios/:path*",
    "/fornecedores/:path*",
    "/protocolos/:path*",
    "/contratos/:path*",
    "/licitacoes/:path*",
    "/configuracoes/:path*",
    "/relatorios/:path*",
  ],
};
