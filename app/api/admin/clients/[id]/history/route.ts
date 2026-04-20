import { NextResponse, type NextRequest } from "next/server";
import { getClientFollowUpHistory } from "@/lib/crm";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ message: "Admin token is required." }, { status: 401 });
    }

    const { id } = await context.params;
    const history = await getClientFollowUpHistory(id, token);
    return NextResponse.json({ history });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load client follow-up history.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
