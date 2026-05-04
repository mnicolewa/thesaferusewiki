import { BarcodeLookup } from "@/components/BarcodeLookup";
import { CommunityAlerts } from "@/components/CommunityAlerts";
import { HarmReduction101 } from "@/components/HarmReduction101";
import { InteractionChecker } from "@/components/InteractionChecker";
import { SourceList } from "@/components/SourceList";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>

      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="site-logo">
            Know Your <span className="site-logo-accent">Substance</span>
          </Link>
          <nav aria-label="Site sections">
            <ul className="site-nav">
              <li><a href="#interactions">Drug Interactions</a></li>
              <li><a href="#barcode">Medication Lookup</a></li>
              <li><a href="#harm-reduction">Safety Guides</a></li>
              <li><a href="#sources">Sources</a></li>
            </ul>
          </nav>
        </div>
      </header>

      <div className="app-shell">
        <main className="content-wrap" id="main-content" tabIndex={-1}>
          <section className="hero" aria-label="Site introduction">
            <p className="eyebrow">By the Community, for the Community</p>
            <h1>Know Your Substance</h1>
            <p>
              Free, fact-checked harm reduction information — including drug interaction checks,
              overdose first aid, and medication lookup by barcode.
            </p>
            <div className="hero-links">
              <a href="#interactions">Check Drug Interactions</a>
              <a href="#harm-reduction">Overdose Response</a>
            </div>
          </section>

          <InteractionChecker />
          <BarcodeLookup />
          <HarmReduction101 />
          {/* <CommunityAlerts /> */}
          <SourceList />
        </main>
      </div>

      <footer className="site-footer">
        <p>
          <strong>Know Your Substance</strong> is a community harm reduction resource.
          This site does not provide medical advice. In an emergency, call <strong>911</strong> or your local emergency number.
        </p>
        <p>
          Overdose helpline: <a href="tel:18005228011">1-800-522-8011</a> &nbsp;·&nbsp;
          Crisis Text Line: text <strong>HOME</strong> to <strong>741741</strong>
        </p>
      </footer>
    </>
  );
}
