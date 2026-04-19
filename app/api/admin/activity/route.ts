import { NextResponse } from "next/server";
import { getScreenActivity, postScreenActivity } from "@/lib/activity";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const activity = await getScreenActivity(token);
    return NextResponse.json({ activity });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load screen activity.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = (await request.json()) as {
      routePath: string;
      routeLabel?: string;
      activeSeconds?: number;
      idleSeconds?: number;
      clientTime?: string;
    };

    const result = await postScreenActivity(
      {
        routePath: body.routePath,
        routeLabel: body.routeLabel,
        activeSeconds: Number(body.activeSeconds ?? 0),
        idleSeconds: Number(body.idleSeconds ?? 0),
        clientTime: body.clientTime,
      },
      token
    );
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save screen activity.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
