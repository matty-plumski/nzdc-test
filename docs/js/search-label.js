document.addEventListener("DOMContentLoaded", function () {
  var searchInputs = document.querySelectorAll(
    '#rtd-search-form input[name="q"]'
  );

  searchInputs.forEach(function (input) {
    input.placeholder = "Search dictionary";
    input.setAttribute("aria-label", "Search dictionary");
    input.title = "Search dictionary";
  });
});