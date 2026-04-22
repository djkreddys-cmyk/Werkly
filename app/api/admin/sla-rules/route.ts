import { NextResponse } from "next/server";
import { getSlaRules, updateSlaRules } from "@/lib/workflow";

export async function GET(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const rules = await getSlaRules(token);
    return NextResponse.json({ rules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load SLA rules.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();
    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = (await request.json()) as { rules?: unknown[] };
    const rules = await updateSlaRules((body.rules ?? []) as never[], token);
    return NextResponse.json({ rules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update SLA rules.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
