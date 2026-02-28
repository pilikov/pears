(function () {
  function normalize(value) {
    return String(value || "")
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function getOfferHref(card) {
    var text = normalize(card.textContent);
    if (text.indexOf("для семьи и друзей") !== -1 || text.indexOf("компактные семейные дома") !== -1) {
      return "flat-1.html";
    }
    if (text.indexOf("для большой компании") !== -1 || text.indexOf("видом на горы и сад") !== -1) {
      return "flat-2.html";
    }
    return "";
  }

  function setButtonLabel(card) {
    card.querySelectorAll(".textContents p, p.textContents").forEach(function (node) {
      if (normalize(node.textContent) === "получить предложение") {
        node.textContent = "получить подробности";
      }
    });
  }

  function injectDescriptionLink(card, href) {
    if (!href || card.querySelector(".offer-detail-link")) return;
    var ctaText = null;
    card.querySelectorAll(".textContents p, p.textContents").forEach(function (node) {
      if (ctaText) return;
      if (normalize(node.textContent) === "получить подробности") {
        ctaText = node;
      }
    });
    if (!ctaText) return;
    var ctaRoot = ctaText.closest("div");
    if (!ctaRoot || !ctaRoot.parentElement || !ctaRoot.parentElement.parentElement) return;
    var buttonShell = ctaRoot.parentElement;
    var link = document.createElement("a");
    link.className = "offer-detail-link";
    link.href = href;
    link.textContent = "описание";
    buttonShell.parentElement.insertBefore(link, buttonShell);
  }

  function makeCardClickable(card, href) {
    if (!href || card.dataset.detailCardReady === "1") return;
    card.dataset.detailCardReady = "1";
    card.classList.add("offer-detail-card");
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "link");
    card.setAttribute("aria-label", "Открыть описание объекта");
    card.addEventListener("click", function (event) {
      var target = event.target;
      if (target && target.closest("a, button")) return;
      window.location.href = href;
    });
    card.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      window.location.href = href;
    });
  }

  function run(root) {
    (root || document).querySelectorAll("#container .section-offers .css-22itc5").forEach(function (card) {
      var href = getOfferHref(card);
      if (!href) return;
      setButtonLabel(card);
      injectDescriptionLink(card, href);
      makeCardClickable(card, href);
    });
  }

  function watch() {
    var observer = new MutationObserver(function () {
      run(document);
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      run(document);
      watch();
    }, { once: true });
  } else {
    run(document);
    watch();
  }
})();
