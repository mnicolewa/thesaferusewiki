import { BarcodeLookup } from "@/components/BarcodeLookup";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { GlobalSearch } from "@/components/GlobalSearch";
import { GoodSamaritanCard } from "@/components/GoodSamaritanCard";
import { HarmReduction101 } from "@/components/HarmReduction101";
import { InteractionChecker } from "@/components/InteractionChecker";
import { ScrollToTopOnLoad } from "@/components/ScrollToTopOnLoad";
import { SourceList } from "@/components/SourceList";
import { TreatmentLocator } from "@/components/TreatmentLocator";
import Link from "next/link";

const DONATION_URL = "https://ko-fi.com/washingtondesignlab";

export default function Home() {
  return (
    <>
      <ScrollToTopOnLoad />
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* ── Emergency strip ── */}
      <div className="emergency-strip" role="note" aria-label="Emergency resources">
        <strong>Emergency?</strong>
        <span>Call <a href="tel:911">911</a></span>
        <span className="emergency-strip-sep">·</span>
        <span>Poison Control: <a href="tel:18002221222">1-800-222-1222</a></span>
        <span className="emergency-strip-sep">·</span>
        <span>SAMHSA Helpline: <a href="tel:18006624357">1-800-662-4357</a> (free, 24/7)</span>
      </div>

      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-logo">
            Know Your <span className="site-logo-accent">Substance</span>
          </Link>
          <GlobalSearch />
          <nav aria-label="Site sections">
            <ul className="site-nav">
              <li><a href="#interactions">Interactions</a></li>
              <li><a href="#support">Find Help</a></li>
              <li><a href="#harm-reduction">Safety</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="app-shell">
        <main className="content-wrap" id="main-content" tabIndex={-1}>

          {/* ── Task router (replaces hero) ── */}
          <section className="task-router" aria-label="How can we help you today?">
            <p className="eyebrow">Free · Anonymous · Community-reviewed</p>
            <h1 className="task-router-headline">How can we help you?</h1>
            <p className="task-router-sub">Harm reduction information — no account, no tracking.</p>
            <div className="task-router-grid">
              <a href="#harm-reduction" className="task-card task-card--emergency">
                <span className="task-card-eyebrow">Urgent</span>
                <strong>Someone is overdosing</strong>
                <span>Step-by-step first aid, DRABC protocol, when to call 911</span>
              </a>
              <a href="#interactions" className="task-card task-card--tool">
                <span className="task-card-eyebrow">Safety check</span>
                <strong>Check a drug or combination</strong>
                <span>Interaction checker, barcode lookup, substance facts</span>
              </a>
              <a href="#support" className="task-card task-card--find">
                <span className="task-card-eyebrow">Near you</span>
                <strong>Find nearby help</strong>
                <span>Naloxone access, treatment centers, syringe services &amp; crisis lines</span>
              </a>
            </div>
          </section>

          {/* ── How this site works ── */}
          <div className="how-it-works" role="note">
            <span className="how-it-works-title">How this site works</span>
            <ul className="how-it-works-items">
              <li>Data from FDA, NIH, RxNav &amp; SAMHSA</li>
              <li>No login or account needed</li>
              <li>Not a substitute for emergency care</li>
            </ul>
            <span className="how-it-works-privacy">No data stored · No tracking</span>
          </div>

          <div className="overdose-cards" aria-label="Good Samaritan laws">
            <GoodSamaritanCard />
          </div>

          <InteractionChecker />
          <BarcodeLookup />
          <TreatmentLocator mapboxToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? null} />
          <HarmReduction101 />
          <SourceList />
          <FeedbackWidget />
        </main>
      </div>

      <footer className="site-footer">
        <p>
          <strong>Know Your Substance</strong> is a community harm reduction resource.
          This site does not provide medical advice. In an emergency, call <strong>911</strong> or your local emergency number.
        </p>
        <p>
          SAMHSA Helpline: <a href="tel:18006624357">1-800-662-4357</a> &nbsp;·&nbsp;
          Crisis Text Line: text <strong>HOME</strong> to <strong>741741</strong> &nbsp;·&nbsp;
          Poison Control: <a href="tel:18002221222">1-800-222-1222</a>
        </p>
        <div className="site-footer-donate">
          <a
            className="site-footer-donate-link"
            href={DONATION_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Donate to the creator on Ko-fi"
          >
            Donate to the creator
          </a>
        </div>
        <p className="site-footer-credit">
          Designed &amp; engineered by Nicole &copy; 2026
        </p>
      </footer>
    </>
  );
}

