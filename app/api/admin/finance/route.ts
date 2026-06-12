import { NextResponse } from "next/server";
import { hasFinanceStoreData, type FinanceStore } from "@/lib/finance";
import { readServerFinanceStore, writeServerFinanceStore } from "@/lib/server-finance-store";

function getToken(request: Request) {
  return request.headers.get("authorization")?.replace("Bearer ", "").trim();
}

function requireToken(request: Request) {
  const token = getToken(request);
  if (!token) {
    throw new Error("Admin token is required.");
  }
  return token;
}

export async function GET(request: Request) {
  try {
    requireToken(request);
    const store = await readServerFinanceStore();
    return NextResponse.json(store);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load finance records.";
    return NextResponse.json({ message }, { status: message.includes("token") ? 401 : 500 });
  }
}

export async function PUT(request: Request) {
  try {
    requireToken(request);
    const payload = (await request.json()) as FinanceStore;
    const savedStore = await writeServerFinanceStore(payload);
    return NextResponse.json(savedStore);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save finance records.";
    return NextResponse.json({ message }, { status: message.includes("token") ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    requireToken(request);
    const payload = (await request.json()) as FinanceStore;
    const current = await readServerFinanceStore();
    const savedStore = hasFinanceStoreData(current) ? current : await writeServerFinanceStore(payload);
    return NextResponse.json(savedStore);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to migrate finance records.";
    return NextResponse.json({ message }, { status: message.includes("token") ? 401 : 500 });
  }
}
