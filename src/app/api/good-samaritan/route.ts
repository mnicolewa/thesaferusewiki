import { NextRequest, NextResponse } from "next/server";
import {
  getGoodSamaritanNote,
  getStateOptions,
  resolveStateCode,
} from "@/lib/good-samaritan";

export async function GET(request: NextRequest) {
  const stateQuery = request.nextUrl.searchParams.get("state");
  const resolvedCode = resolveStateCode(stateQuery);
  const note = getGoodSamaritanNote(stateQuery);

  return NextResponse.json({
    selectedStateInput: stateQuery ?? null,
    selectedStateCode: resolvedCode,
    note,
    availableStates: getStateOptions(),
  });
}
