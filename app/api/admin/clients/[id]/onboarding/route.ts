import { NextResponse, type NextRequest } from "next/server";
import { updateClientOnboarding, type ClientFormPayload } from "@/lib/crm";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const body = (await request.json()) as Pick<ClientFormPayload, "onboardingStatus" | "notes">;
    const { id } = await context.params;
    const client = await updateClientOnboarding(id, body, token);
    return NextResponse.json(client);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update client onboarding.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
