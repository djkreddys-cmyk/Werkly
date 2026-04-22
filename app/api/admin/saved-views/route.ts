import { NextResponse } from "next/server";
import { getSavedViews, saveCurrentView } from "@/lib/workflow";

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim();
}

export async function GET(request: Request) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const views = await getSavedViews(token, {
      moduleKey: searchParams.get("moduleKey") || undefined,
      scope: (searchParams.get("scope") as "mine" | "all" | null) || undefined,
    });
    return NextResponse.json({ views });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load saved views.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = getToken(request);
    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const payload = await request.json();
    const view = await saveCurrentView(payload, token);
    return NextResponse.json(view, { status: payload?.id ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save current view.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
