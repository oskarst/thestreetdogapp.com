import { NextResponse } from "next/server";

// Tiny connectivity probe for the offline banner. Always dynamic + uncached
// so a successful response means the network actually reached the server.
export const dynamic = "force-dynamic";

export function GET() {
  return new NextResponse(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  });
}
