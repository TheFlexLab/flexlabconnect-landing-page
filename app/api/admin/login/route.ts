import { NextRequest, NextResponse } from "next/server";
import { credentialsAreValid, setAdminSession } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = body.username?.trim() || "";
    const password = body.password || "";

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    if (!credentialsAreValid(username, password)) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }

    await setAdminSession(username);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to sign in. Please try again." }, { status: 500 });
  }
}
