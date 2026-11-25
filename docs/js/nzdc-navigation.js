document.addEventListener("DOMContentLoaded", function () {
  var sidebar = document.querySelector(
    ".wy-menu.wy-menu-vertical"
  );

  if (!sidebar) {
    return;
  }

  /*
   * Locate the currently active MkDocs navigation item.
   */
  var currentRange = sidebar.querySelector(
    "li.current"
  );

  if (!currentRange) {
    return;
  }

  currentRange.classList.add(
    "nzdc-active-range"
  );

  /*
   * Walk upwards through the DOM until we find another LI.
   * That is the parent navigation item, e.g. the letter E.
   */
  var ancestor = currentRange.parentNode;
  var parentLetter = null;

  while (
    ancestor &&
    ancestor !== sidebar
  ) {
    if (
      ancestor.tagName &&
      ancestor.tagName.toLowerCase() === "li"
    ) {
      parentLetter = ancestor;
      break;
    }

    ancestor = ancestor.parentNode;
  }

  if (parentLetter) {
    parentLetter.classList.add(
      "nzdc-active-letter"
    );

    parentLetter.classList.add(
      "current"
    );

    parentLetter.setAttribute(
      "aria-expanded",
      "true"
    );
  }

  /*
   * Mark child TOC lists underneath the current range.
   */
  var lists =
    currentRange.getElementsByTagName("ul");

  for (
    var i = 0;
    i < lists.length;
    i++
  ) {
    lists[i].classList.add(
      "nzdc-headword-nav"
    );
  }

  currentRange.setAttribute(
    "aria-expanded",
    "true"
  );

  console.log(
    "NZDC hierarchical navigation enabled",
    {
      range: currentRange,
      letter: parentLetter
    }
  );
});