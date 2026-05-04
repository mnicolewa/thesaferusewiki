"use client";

import { ExternalLink, Phone, MessageSquare, MapPin } from "lucide-react";

type Resource = {
  name: string;
  description: string;
  type: "phone" | "text" | "web" | "map";
  action: string;       // href or tel:
  actionLabel: string;
  badge?: string;
};

const RESOURCES: Resource[] = [
  {
    name: "SAMHSA National Helpline",
    description: "Free, confidential, 24/7 treatment referral and information service in English and Spanish.",
    type: "phone",
    action: "tel:18006624357",
    actionLabel: "Call 1-800-662-4357",
    badge: "24/7 · Free · Confidential",
  },
  {
    name: "988 Suicide & Crisis Lifeline",
    description: "Call or text 988 for mental health and substance use crisis support.",
    type: "phone",
    action: "tel:988",
    actionLabel: "Call or Text 988",
    badge: "24/7 · Free",
  },
  {
    name: "Crisis Text Line",
    description: "Text HOME to 741741 for free, 24/7 crisis support via text message.",
    type: "text",
    action: "sms:741741?body=HOME",
    actionLabel: "Text HOME to 741741",
    badge: "24/7 · Free",
  },
  {
    name: "Text your ZIP for treatment locations",
    description: "SAMHSA text service: text your 5-digit ZIP code to 435748 (HELP4U) to receive nearby treatment center information.",
    type: "text",
    action: "sms:435748",
    actionLabel: "Text ZIP to HELP4U (435748)",
    badge: "SAMHSA",
  },
  {
    name: "FindTreatment.gov",
    description: "SAMHSA's official treatment locator — search by address for nearby treatment centers, mental health services, and more.",
    type: "web",
    action: "https://findtreatment.gov/",
    actionLabel: "Open FindTreatment.gov",
    badge: "Official · SAMHSA",
  },
  {
    name: "NEXT Distro — Naloxone & Harm Reduction",
    description: "Mail-order naloxone and harm reduction supplies. Available in participating states.",
    type: "web",
    action: "https://www.nextdistro.org/",
    actionLabel: "Visit NEXT Distro",
  },
  {
    name: "NASEN — Syringe Services Near You",
    description: "Directory of syringe service programs across the US maintained by the National Alliance of Syringe Service Programs.",
    type: "web",
    action: "https://www.nasen.org/map/",
    actionLabel: "Find syringe services",
  },
  {
    name: "Narcan availability at pharmacies",
    description: "Naloxone (Narcan) is available without a prescription at most CVS, Walgreens, and Rite Aid locations. Show the pharmacist — no Rx needed in most states.",
    type: "map",
    action: "https://www.cvs.com/immunizations/",
    actionLabel: "Find CVS pharmacy",
  },
];

const ICON_MAP = {
  phone: Phone,
  text: MessageSquare,
  web: ExternalLink,
  map: MapPin,
};

export function TreatmentLocator({ mapboxToken: _ }: { mapboxToken: string | null }) {
  return (
    <section className="panel panel-tool" id="support" aria-labelledby="support-heading">
      <h2 id="support-heading">Find Help &amp; Harm Reduction Resources</h2>
      <p className="section-intro">
        Verified hotlines, text services, and online locators for treatment centers, naloxone access, and syringe services. All resources are free and confidential.
      </p>

      <div className="resource-directory">
        {RESOURCES.map((r) => {
          const Icon = ICON_MAP[r.type];
          const isExternal = r.type === "web" || r.type === "map";
          return (
            <article key={r.name} className="resource-card">
              <div className="resource-card-header">
                <Icon size={16} className="resource-icon" aria-hidden="true" />
                <h3>{r.name}</h3>
                {r.badge && <span className="resource-badge">{r.badge}</span>}
              </div>
              <p className="resource-description">{r.description}</p>
              <a
                href={r.action}
                className="resource-action"
                {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {r.actionLabel}
                {isExternal && <ExternalLink size={12} aria-hidden="true" />}
              </a>
            </article>
          );
        })}
      </div>

      <p className="tiny-note">
        This is a safety reference. In an emergency, call <strong>911</strong>. Data sourced from SAMHSA, NASEN, and NEXT Distro — verify availability in your area.
      </p>
    </section>
  );
}

