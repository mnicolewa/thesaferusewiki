import { NextRequest, NextResponse } from "next/server";
import { createAlert, listAlerts } from "@/lib/alerts-store";

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("latitude"));
  const longitude = Number(request.nextUrl.searchParams.get("longitude"));
  const radiusKm = Number(request.nextUrl.searchParams.get("radiusKm"));

  const useLocation = Number.isFinite(latitude) && Number.isFinite(longitude);

  const alerts = useLocation
    ? listAlerts({
        latitude,
        longitude,
        radiusKm: Number.isFinite(radiusKm) ? radiusKm : 80,
      })
    : listAlerts();

  return NextResponse.json({ alerts });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const city = typeof body.city === "string" ? body.city.trim() : "";
  const region = typeof body.region === "string" ? body.region.trim() : "";
  const warning = typeof body.warning === "string" ? body.warning.trim() : "";
  const substance = typeof body.substance === "string" ? body.substance.trim() : "";
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (!city || !region || !warning || !substance) {
    return NextResponse.json(
      { error: "city, region, warning, and substance are required" },
      { status: 400 }
    );
  }

  const alert = createAlert({
    city,
    region,
    warning,
    substance,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
  });

  return NextResponse.json({ alert }, { status: 201 });
}
