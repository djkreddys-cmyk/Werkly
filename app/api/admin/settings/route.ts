import { NextResponse } from "next/server";
import { getCrmSettings, updateCrmSettings, type CrmKpiSettings } from "@/lib/crm";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const settings = await getCrmSettings(token);
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load CRM settings.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const payload = (await request.json()) as Partial<CrmKpiSettings>;
    const settings = await updateCrmSettings(payload, token);
    return NextResponse.json(settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update CRM settings.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
