export type Citation = {
  id: string;
  title: string;
  url: string;
  publisher: string;
  checkedAt: string;
};

export const citations: Citation[] = [
  {
    id: "cdc-overdose-signs",
    title: "How to Recognize and Respond to an Opioid Overdose",
    url: "https://www.cdc.gov/overdose-prevention/reversing-overdose/index.html",
    publisher: "CDC",
    checkedAt: "2026-05-03",
  },
  {
    id: "samhsa-naloxone",
    title: "Opioid Overdose Prevention Toolkit",
    url: "https://store.samhsa.gov/product/opioid-overdose-prevention-toolkit/pep23-03-00-001",
    publisher: "SAMHSA",
    checkedAt: "2026-05-03",
  },
  {
    id: "nida-fentanyl",
    title: "Fentanyl Drug Facts",
    url: "https://nida.nih.gov/research-topics/fentanyl",
    publisher: "NIDA",
    checkedAt: "2026-05-03",
  },
  {
    id: "who-harm-reduction",
    title: "Harm Reduction",
    url: "https://www.who.int/health-topics/harm-reduction",
    publisher: "WHO",
    checkedAt: "2026-05-03",
  },
  {
    id: "rxnav",
    title: "RxNav API",
    url: "https://lhncbc.nlm.nih.gov/RxNav/APIs/index.html",
    publisher: "U.S. National Library of Medicine",
    checkedAt: "2026-05-03",
  },
  {
    id: "openfda",
    title: "openFDA Drug APIs",
    url: "https://open.fda.gov/apis/drug/",
    publisher: "U.S. FDA",
    checkedAt: "2026-05-03",
  },
  {
    id: "pubchem",
    title: "PubChem REST API",
    url: "https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest",
    publisher: "NIH / PubChem",
    checkedAt: "2026-05-04",
  },
  {
    id: "pubmed",
    title: "PubMed E-utilities",
    url: "https://www.ncbi.nlm.nih.gov/books/NBK25501/",
    publisher: "NCBI / NIH",
    checkedAt: "2026-05-04",
  },
  {
    id: "samhsaLocator",
    title: "SAMHSA Treatment Locator",
    url: "https://findtreatment.gov/",
    publisher: "SAMHSA",
    checkedAt: "2026-05-04",
  },
  {
    id: "drugbank",
    title: "DrugBank API",
    url: "https://www.drugbank.com/",
    publisher: "DrugBank",
    checkedAt: "2026-05-04",
  },
];

export const citationMap = Object.fromEntries(citations.map((item) => [item.id, item]));
