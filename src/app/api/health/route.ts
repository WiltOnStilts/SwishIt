import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Render's free tier answers /robots.txt itself while this service is asleep,
// and that response does not wake the app. Ping this path to keep the service
// awake so Google fetches the real robots.txt.
export function GET() {
  return new NextResponse("ok", {
    status: 200,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
