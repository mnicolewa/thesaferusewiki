import { NextRequest, NextResponse } from "next/server";
import { citationMap } from "@/lib/citations";
import {
  findTreatmentCenters,
  getNaloxoneLocations,
  getSyringeServices,
} from "@/services/samhsa";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    zip?: string;
    radius?: number;
    serviceType?: "treatment" | "naloxone" | "syringe";
  };

  const zip = body.zip?.trim();
  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: "Enter a valid 5-digit ZIP code." }, { status: 400 });
  }

  try {
    let results;
    switch (body.serviceType) {
      case "naloxone":
        results = await getNaloxoneLocations(zip);
        break;
      case "syringe":
        results = await getSyringeServices(zip);
        break;
      default:
        results = await findTreatmentCenters(zip, body.radius ?? 25);
        break;
    }

    return NextResponse.json({
      results,
      source: citationMap.samhsaLocator,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Nearby service information is unavailable right now.";

    return NextResponse.json(
      {
        error: message,
        results: [],
        source: citationMap.samhsaLocator,
      },
      { status: 502 }
    );
  }
}
