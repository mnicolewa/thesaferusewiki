import { pingUrl, toPlainLanguageError } from "@/services/http";

const SAMHSA_BASE = "https://findtreatment.gov/locator/api";

export type TreatmentCenter = {
  name: string;
  address: string;
  phone: string | null;
  services: string[];
  distance: number | null;
  lat: number | null;
  lng: number | null;
  type: "naloxone" | "treatment" | "syringe";
};

type RawCenter = {
  Name?: string;
  name?: string;
  Address1?: string;
  address1?: string;
  City?: string;
  city?: string;
  State?: string;
  state?: string;
  Zip?: string;
  zip?: string;
  Phone?: string;
  phone?: string;
  Services?: string[] | string;
  services?: string[] | string;
  Distance?: number;
  distance?: number;
  Latitude?: number | string;
  latitude?: number | string;
  Longitude?: number | string;
  longitude?: number | string;
};

type SamhsaResponse = {
  results?: RawCenter[];
  facilities?: RawCenter[];
};

function normalizeServices(value: string[] | string | undefined) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value.split(/,|;/).map((item) => item.trim()).filter(Boolean);
}

function normalizeType(center: RawCenter): TreatmentCenter["type"] {
  const haystack = [center.Name, center.name, center.Services, center.services]
    .flat()
    .join(" ")
    .toLowerCase();

  if (haystack.includes("naloxone")) return "naloxone";
  if (haystack.includes("syringe") || haystack.includes("needle")) return "syringe";
  return "treatment";
}

function mapCenter(center: RawCenter): TreatmentCenter {
  const address = [
    center.Address1 ?? center.address1,
    center.City ?? center.city,
    center.State ?? center.state,
    center.Zip ?? center.zip,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    name: center.Name ?? center.name ?? "Unnamed provider",
    address,
    phone: center.Phone ?? center.phone ?? null,
    services: normalizeServices(center.Services ?? center.services),
    distance: center.Distance ?? center.distance ?? null,
    lat: Number(center.Latitude ?? center.latitude) || null,
    lng: Number(center.Longitude ?? center.longitude) || null,
    type: normalizeType(center),
  };
}

/**
 * Finds nearby treatment centers from the SAMHSA treatment locator.
 */
export async function findTreatmentCenters(
  zip: string,
  radius = 25,
  serviceType = "SA"
): Promise<TreatmentCenter[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const url = new URL(SAMHSA_BASE);
    url.searchParams.set("sType", serviceType);
    url.searchParams.set("zip", zip);
    url.searchParams.set("distance", String(radius));
    url.searchParams.set("output", "json");

    const response = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("SAMHSA treatment web service is unavailable right now.");
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error(
        "SAMHSA treatment web service is temporarily unavailable. Use FindTreatment.gov directly."
      );
    }

    const data = (await response.json()) as SamhsaResponse;
    const rows = data.results ?? data.facilities ?? [];
    return rows.map(mapCenter);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The SAMHSA locator is taking too long to respond. Please try again.");
    }

    if (error instanceof Error && error.message.includes("FindTreatment.gov directly")) {
      throw error;
    }

    throw new Error(toPlainLanguageError(error, "Treatment locations are unavailable right now."));
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Returns naloxone-related locations near a zip code.
 */
export async function getNaloxoneLocations(zip: string) {
  const centers = await findTreatmentCenters(zip);
  return centers.filter((center) => center.type === "naloxone");
}

/**
 * Returns syringe service locations near a zip code.
 */
export async function getSyringeServices(zip: string) {
  const centers = await findTreatmentCenters(zip);
  return centers.filter((center) => center.type === "syringe");
}

/**
 * Performs a basic health check against the SAMHSA locator.
 */
export async function ping() {
  return pingUrl(`${SAMHSA_BASE}?sType=SA&zip=10001&distance=5&output=json`);
}
