import { citationMap } from "@/lib/citations";
import { harmReductionCards, overdoseFirstAid } from "@/lib/content";
import { DrabcBanner } from "./DrabcBanner";
import { GoodSamaritanCard } from "./GoodSamaritanCard";
import { OverdoseCard } from "./OverdoseCard";

export function HarmReduction101() {
  return (
    <section className="panel" id="harm-reduction" aria-labelledby="harm-heading">
      <h2 id="harm-heading">Safety Guides &amp; Overdose Response</h2>
      <p className="section-intro">
        Practical, plain-language safety guides written by and for the community — reviewed against public health references. Includes overdose signs and step-by-step first aid.
      </p>

      <div className="card-grid">
        {harmReductionCards.map((card) => (
          <article key={card.title} className="mini-card">
            <h3>{card.title}</h3>
            <p>{card.summary}</p>
            <ul className="stack-list">
              {card.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <p className="tiny-note">
              Sources:{" "}
              {card.citationIds.map((id, index) => {
                const source = citationMap[id];
                if (!source) {
                  return null;
                }
                return (
                  <span key={id}>
                    {index > 0 ? ", " : ""}
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.publisher}
                    </a>
                  </span>
                );
              })}
            </p>
          </article>
        ))}
      </div>

      <h3 className="overdose-section-heading">Overdose Signs &amp; First Aid</h3>
      <DrabcBanner />
      <div className="overdose-cards">
        {overdoseFirstAid.map((item) => (
          <OverdoseCard key={item.substance} {...item} />
        ))}
        <GoodSamaritanCard />
      </div>
    </section>
  );
}
