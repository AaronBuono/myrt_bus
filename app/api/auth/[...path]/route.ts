import { authApiHandler } from "@neondatabase/auth/next/server";
import type { NextRequest } from "next/server";

// Lazily initialised so build-time analysis doesn't throw without env vars.
let _handler: ReturnType<typeof authApiHandler> | null = null;
function getHandler() {
  if (!_handler) _handler = authApiHandler();
  return _handler;
}

export function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return getHandler().GET(req, ctx);
}
export function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return getHandler().POST(req, ctx);
}
