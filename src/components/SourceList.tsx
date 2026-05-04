import { citations } from "@/lib/citations";

export function SourceList() {
  return (
    <section className="panel panel-reference" id="sources" aria-labelledby="sources-heading">
      <h2 id="sources-heading">Sources &amp; References</h2>
      <p className="section-intro">
        All content on this site is drawn from the following public health and clinical references, checked for accuracy.
      </p>
      <ul className="stack-list">
        {citations.map((source) => (
          <li key={source.id}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.title}
            </a>{" "}
            ({source.publisher}) - checked {source.checkedAt}
          </li>
        ))}
      </ul>
    </section>
  );
}
