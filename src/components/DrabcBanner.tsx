import {
  AlertTriangle,
  UserCheck,
  Wind,
  Activity,
  Heart,
} from "lucide-react";

const steps = [
  { letter: "D", label: "Danger", icon: AlertTriangle, color: "#dc2626" },
  { letter: "R", label: "Response", icon: UserCheck, color: "#d97706" },
  { letter: "A", label: "Airway", icon: Wind, color: "#0f766e" },
  { letter: "B", label: "Breathing", icon: Activity, color: "#2563eb" },
  { letter: "C", label: "Circulation", icon: Heart, color: "#be185d" },
];

export function DrabcBanner() {
  return (
    <div className="drabc-banner" role="note" aria-label="DRABC first-aid protocol">
      <p className="drabc-label">Universal First Aid Protocol — DRABC</p>
      <ol className="drabc-steps">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.letter} className="drabc-step">
              <span className="drabc-icon" style={{ color: step.color }}>
                <Icon size={22} aria-hidden="true" />
              </span>
              <span className="drabc-letter" style={{ color: step.color }}>
                {step.letter}
              </span>
              <span className="drabc-step-label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
