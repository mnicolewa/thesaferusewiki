export type VerificationState = "pending" | "verified" | "partner-verified";

export type CommunityAlert = {
  id: string;
  city: string;
  region: string;
  warning: string;
  substance: string;
  createdAt: string;
  upvotes: number;
  verification: VerificationState;
  sourceNotes?: string;
  latitude?: number;
  longitude?: number;
};

type CreateAlertInput = {
  city: string;
  region: string;
  warning: string;
  substance: string;
  latitude?: number;
  longitude?: number;
};

const alerts = new Map<string, CommunityAlert>([
  [
    "seed-1",
    {
      id: "seed-1",
      city: "Portland",
      region: "OR",
      warning: "Multiple reports of unusually strong powder sold as ketamine. Test first and avoid using alone.",
      substance: "Ketamine (suspected fentanyl contamination)",
      createdAt: new Date("2026-04-30T19:30:00Z").toISOString(),
      upvotes: 17,
      verification: "partner-verified",
      sourceNotes: "Cross-checked with two community org reports.",
      latitude: 45.5152,
      longitude: -122.6784,
    },
  ],
  [
    "seed-2",
    {
      id: "seed-2",
      city: "Seattle",
      region: "WA",
      warning: "Blue pressed pills in Capitol Hill linked to 3 overdose reversals this week.",
      substance: "Counterfeit oxycodone pills",
      createdAt: new Date("2026-05-01T21:10:00Z").toISOString(),
      upvotes: 24,
      verification: "verified",
      sourceNotes: "Verified by volunteer moderator network.",
      latitude: 47.6062,
      longitude: -122.3321,
    },
  ],
]);

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

export function listAlerts(near?: { latitude: number; longitude: number; radiusKm?: number }) {
  const items = Array.from(alerts.values()).sort((a, b) => {
    if (b.upvotes !== a.upvotes) {
      return b.upvotes - a.upvotes;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (!near) {
    return items;
  }

  const radiusKm = near.radiusKm ?? 80;
  return items.filter((item) => {
    if (item.latitude == null || item.longitude == null) {
      return false;
    }
    return distanceKm(near.latitude, near.longitude, item.latitude, item.longitude) <= radiusKm;
  });
}

export function createAlert(input: CreateAlertInput) {
  const id = `alert-${Math.random().toString(36).slice(2, 10)}`;
  const alert: CommunityAlert = {
    id,
    city: input.city,
    region: input.region,
    warning: input.warning,
    substance: input.substance,
    createdAt: new Date().toISOString(),
    upvotes: 1,
    verification: "pending",
    latitude: input.latitude,
    longitude: input.longitude,
  };
  alerts.set(id, alert);
  return alert;
}

export function upvoteAlert(id: string) {
  const current = alerts.get(id);
  if (!current) {
    return null;
  }
  const updated = {
    ...current,
    upvotes: current.upvotes + 1,
  };
  alerts.set(id, updated);
  return updated;
}
