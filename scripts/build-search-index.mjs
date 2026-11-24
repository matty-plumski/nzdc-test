import fs from "node:fs/promises";
import lunr from "lunr";

const searchDataPath =
  process.argv[2] || "site/search/search_index.json";

const raw = await fs.readFile(searchDataPath, "utf8");
const mkdocsData = JSON.parse(raw);

function normalizeForSearch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-NZ")
    .replace(/[‘’]/g, "'")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const documents = mkdocsData.docs.map((document) => ({
  location: document.location,
  title: document.title,
  text: document.text,
  searchTitle: normalizeForSearch(document.title),
  searchText: normalizeForSearch(document.text)
}));

const index = lunr(function () {
  this.ref("location");

  // Headwords and section titles receive much greater weight.
  this.field("searchTitle", {
    boost: 20
  });

  // Definition and citation text receives lower weight.
  this.field("searchText", {
    boost: 2
  });

  // Stemming is unsuitable for dictionary headwords.
  this.pipeline.remove(lunr.stemmer);
  this.searchPipeline.remove(lunr.stemmer);

  for (const document of documents) {
    this.add(document);
  }
});

const output = {
  config: {
    ...mkdocsData.config,
    min_search_length: 2
  },

  docs: documents.map((document) => ({
    location: document.location,
    title: document.title,
    text: document.text
  })),

  index: index.toJSON()
};

await fs.writeFile(
  searchDataPath,
  JSON.stringify(output),
  "utf8"
);

console.log(
  `Built weighted Lunr index for ${documents.length} MkDocs sections.`
);
