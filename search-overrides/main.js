function joinUrl(base, path) {
  if (/^(?:[a-z]+:)?\/\//i.test(path)) {
    return path;
  }

  return (
    (base || ".").replace(/\/$/, "") +
    "/" +
    String(path).replace(/^\//, "")
  );
}

function escapeHtml(value) {
  return String(value || "").replace(
    /[&<>"']/g,
    function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character];
    }
  );
}

function getQuery() {
  return new URLSearchParams(window.location.search).get("q") || "";
}

function highlight(value, query) {
  let output = escapeHtml(value);

  query
    .split(/\s+/)
    .filter(Boolean)
    .sort(function (a, b) {
      return b.length - a.length;
    })
    .forEach(function (term) {
      const safeTerm = term.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      output = output.replace(
        new RegExp("(" + safeTerm + ")", "gi"),
        "<mark>$1</mark>"
      );
    });

  return output;
}

function displayResults(results) {
  const container = document.getElementById(
    "mkdocs-search-results"
  );

  const input = document.getElementById(
    "mkdocs-search-query"
  );

  if (!container || !input) return;

  container.innerHTML = "";

  let count = document.getElementById(
    "nzdc-result-count"
  );

  if (!count) {
    count = document.createElement("p");
    count.id = "nzdc-result-count";

    container.parentNode.insertBefore(
      count,
      container
    );
  }

  count.textContent =
    results.length +
    " result" +
    (results.length === 1 ? "" : "s");

  if (!results.length) {
    container.innerHTML = "<p>No results found.</p>";
    return;
  }

  results.slice(0, 50).forEach(function (result) {
    const article = document.createElement("article");
    article.className = "nzdc-search-result";

    article.innerHTML =
      '<h3><a href="' +
      escapeHtml(joinUrl(base_url, result.location)) +
      '">' +
      highlight(result.title, input.value) +
      "</a></h3>" +
      "<p>" +
      highlight(result.summary, input.value) +
      "</p>";

    container.appendChild(article);
  });
}

let timer;

const worker = new Worker(
  joinUrl(base_url, "search/worker.js")
);

function runSearch() {
  const input = document.getElementById(
    "mkdocs-search-query"
  );

  if (!input) return;

  const query = input.value.trim();

  clearTimeout(timer);

  timer = setTimeout(function () {
    if (query.length >= 2) {
      worker.postMessage({ query: query });
    } else {
      displayResults([]);
    }
  }, 150);
}

worker.onmessage = function (event) {
  if (event.data.allowSearch) {
    const input = document.getElementById(
      "mkdocs-search-query"
    );

    if (!input) return;

    input.addEventListener("input", runSearch);

    const query = getQuery();

    if (query) {
      input.value = query;
      runSearch();
    }
  } else if (event.data.results) {
    displayResults(event.data.results);
  } else if (event.data.error) {
    const container = document.getElementById(
      "mkdocs-search-results"
    );

    if (container) {
      container.textContent = event.data.error;
    }
  }
};

worker.postMessage({ init: true });