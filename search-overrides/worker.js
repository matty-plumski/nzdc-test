let index;
let documents = {};
let ready = false;

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function initialise() {
  importScripts("lunr.js");

  const request = new XMLHttpRequest();

  request.onload = function () {
    const data = JSON.parse(request.responseText);

    index = lunr.Index.load(data.index);

    data.docs.forEach(function (document) {
      documents[document.location] = document;
    });

    ready = true;

    postMessage({
      config: data.config || { min_search_length: 2 }
    });

    postMessage({ allowSearch: true });
  };

  request.onerror = function () {
    postMessage({
      error: "The search index could not be loaded."
    });
  };

  request.open("GET", "search_index.json");
  request.send();
}

function titleBonus(title, query) {
  const headword = normalize(title);
  const searchTerm = normalize(query);

  if (headword === searchTerm) return 10000;
  if (headword.startsWith(searchTerm)) return 3000;
  if (headword.includes(searchTerm)) return 1000;

  return 0;
}

function createSummary(document, query) {
  const text = String(document.text || "")
    .replace(/\s+/g, " ")
    .trim();

  const position = normalize(text).indexOf(normalize(query));
  const start = position < 0 ? 0 : Math.max(0, position - 70);
  const summary = text.slice(start, start + 240);

  return (
    (start > 0 ? "…" : "") +
    summary +
    (text.length > start + 240 ? "…" : "")
  );
}

function search(query) {
  if (!ready) return [];

  const terms = normalize(query)
    .split(/\s+/)
    .filter(Boolean);

  const matches = index.query(function (lunrQuery) {
    terms.forEach(function (term) {
      lunrQuery.term(term, {
        fields: ["searchTitle"],
        boost: 20,
        presence: lunr.Query.presence.REQUIRED
      });

      lunrQuery.term(term, {
        fields: ["searchTitle"],
        boost: 12,
        wildcard: lunr.Query.wildcard.TRAILING
      });

      lunrQuery.term(term, {
        fields: ["searchText"],
        boost: 2
      });

      lunrQuery.term(term, {
        fields: ["searchText"],
        boost: 1,
        wildcard: lunr.Query.wildcard.TRAILING
      });

      if (term.length >= 5) {
        lunrQuery.term(term, {
          fields: ["searchTitle"],
          boost: 3,
          editDistance: 1
        });
      }
    });
  });

  return matches
    .map(function (match) {
      const document = documents[match.ref];

      return {
        location: document.location,
        title: document.title,
        summary: createSummary(document, query),
        score: match.score + titleBonus(document.title, query)
      };
    })
    .sort(function (left, right) {
      return right.score - left.score;
    })
    .slice(0, 100);
}

onmessage = function (event) {
  if (event.data.init) {
    initialise();
  } else if (event.data.query) {
    postMessage({
      results: search(event.data.query)
    });
  }
};