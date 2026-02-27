/*
  Primland reveal behavior bundle:
  - viewport-triggered start (IntersectionObserver)
  - hidden-before-enter (no flash "visible -> hide -> animate")
  - GSAP + SplitType reveal settings from ownprimland.com:
    from { alpha: 0, filter: "blur(.15em)" }
    to   { alpha: 1, filter: "blur(0em)", stagger: 0.125, duration: 1.5, delay: 0.5 }
*/
(function (global) {
  "use strict";

  var DEFAULTS = {
    gsapUrl: "https://unpkg.com/gsap@3.12.7/dist/gsap.min.js",
    splitTypeUrl: "https://unpkg.com/split-type@0.3.4/umd/index.min.js",
    textSelector: "p",
    observerThreshold: 0,
    observerRootMargin: "0px 0px 0px 0px",
    retryMenuAfterMs: 250
  };

  function normalizeText(text) {
    return (text || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-src="' + src + '"]');
      if (existing) {
        if (existing.dataset.loaded === "1") resolve();
        else existing.addEventListener("load", function () { resolve(); }, { once: true });
        return;
      }

      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.src = src;
      script.onload = function () {
        script.dataset.loaded = "1";
        resolve();
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function createEngine(options) {
    var revealObserver = null;

    function animateText(node) {
      if (!node || node.dataset.primlandRevealReady === "1") return;

      if (global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        node.dataset.primlandRevealReady = "1";
        node.style.opacity = "1";
        node.style.filter = "none";
        return;
      }
      if (!global.gsap || !global.SplitType) {
        if (node.dataset.primlandRevealWaiting === "1") return;
        node.dataset.primlandRevealWaiting = "1";

        var attempts = 0;
        (function retryUntilReady() {
          if (global.gsap && global.SplitType) {
            node.dataset.primlandRevealWaiting = "0";
            animateText(node);
            return;
          }

          attempts += 1;
          if (attempts >= 50) {
            node.dataset.primlandRevealWaiting = "0";
            node.dataset.primlandRevealReady = "1";
            node.style.opacity = "1";
            node.style.filter = "none";
            return;
          }

          global.setTimeout(retryUntilReady, 100);
        })();
        return;
      }

      node.dataset.primlandRevealReady = "1";
      node.style.opacity = "1";
      node.style.filter = "none";
      var split = new global.SplitType(node, { types: "words" });
      global.gsap.fromTo(
        split.words,
        { alpha: 0, filter: "blur(.15em)" },
        { alpha: 1, filter: "blur(0em)", stagger: 0.125, duration: 1.5, delay: 0.5 }
      );
    }

    function prepareTextHidden(node) {
      if (!node || node.dataset.primlandRevealPrepared === "1") return;
      node.dataset.primlandRevealPrepared = "1";
      node.style.opacity = "0";
      node.style.filter = "blur(.15em)";
    }

    function getObserver() {
      if (!("IntersectionObserver" in global)) return null;
      if (revealObserver) return revealObserver;

      revealObserver = new IntersectionObserver(function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          animateText(entry.target);
        });
      }, {
        root: null,
        threshold: options.observerThreshold,
        rootMargin: options.observerRootMargin
      });

      return revealObserver;
    }

    function observeText(node, overrideText) {
      if (!node || node.dataset.primlandRevealReady === "1") return;

      if (typeof overrideText === "string") {
        if (overrideText.indexOf("\n") !== -1) {
          node.innerHTML = overrideText.split("\n").map(escapeHtml).join("<br>");
        } else {
          node.textContent = overrideText;
        }
      }

      prepareTextHidden(node);

      if (global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        animateText(node);
        return;
      }

      var observer = getObserver();
      if (!observer) {
        animateText(node);
        return;
      }

      if (node.dataset.primlandRevealObserved === "1") return;
      node.dataset.primlandRevealObserved = "1";
      observer.observe(node);
    }

    return {
      observeText: observeText,
      animateText: animateText
    };
  }

  function applyHeroRule(engine, rule) {
    if (!rule) return;
    var all = document.querySelectorAll(rule.selector || "p");
    Array.prototype.forEach.call(all, function (node) {
      if (normalizeText(node.textContent) === normalizeText(rule.targetText)) {
        engine.observeText(node, rule.displayText);
      }
    });
  }

  function applyDirectRules(engine, rules, fallbackSelector) {
    if (!Array.isArray(rules) || !rules.length) return;

    rules.forEach(function (rule) {
      if (!rule || !rule.targetText) return;

      var selector = rule.selector || fallbackSelector || "p";
      var all = document.querySelectorAll(selector);

      Array.prototype.forEach.call(all, function (node) {
        if (normalizeText(node.textContent) === normalizeText(rule.targetText)) {
          engine.observeText(node, rule.displayText);
        }
      });
    });
  }

  function applyBySectionLabelRule(engine, rule) {
    if (!rule) return;
    var labels = document.querySelectorAll(rule.selector || "p");
    labels.forEach(function (label) {
      if (normalizeText(label.textContent) !== normalizeText(rule.label)) return;

      var scope = label.parentElement && label.parentElement.parentElement;
      if (!scope) return;

      var candidates = scope.querySelectorAll(rule.selector || "p");
      Array.prototype.forEach.call(candidates, function (node) {
        var text = normalizeText(node.textContent);
        if (rule.matcher(text, node, scope)) {
          engine.observeText(node);
        }
      });
    });
  }

  function applyMenuRule(engine, options) {
    var buttons = document.querySelectorAll("button.interactive-menu__item");
    if (!buttons.length) return false;

    Array.prototype.forEach.call(buttons, function (button) {
      engine.observeText(button);
    });
    return true;
  }

  function runBehavior(options) {
    var engine = createEngine(options);

    applyHeroRule(engine, options.heroRule);
    applyDirectRules(engine, options.directRules, options.textSelector);
    applyBySectionLabelRule(engine, options.aboutRule);
    applyBySectionLabelRule(engine, options.offerRule);

    if (!applyMenuRule(engine, options)) {
      global.setTimeout(function () {
        applyMenuRule(engine, options);
      }, options.retryMenuAfterMs);
    }
  }

  function init(userOptions) {
    var options = Object.assign({}, DEFAULTS, userOptions || {});
    options.heroRule = options.heroRule || {
      selector: options.textSelector,
      targetText: "клубная резиденция на алтае",
      displayText: "клубная\nрезиденция\nна алтае"
    };
    options.aboutRule = options.aboutRule || {
      selector: options.textSelector,
      label: "о нас",
      matcher: function (text) {
        return text.length > 40 && text.indexOf("команда") !== -1 && text.indexOf("алтае") !== -1;
      }
    };
    options.offerRule = options.offerRule || {
      selector: options.textSelector,
      label: "что предлагаем",
      matcher: function (text) {
        return text.length > 60 && text.indexOf("управляющую компанию") !== -1;
      }
    };
    options.directRules = Array.isArray(options.directRules) ? options.directRules : [];

    runBehavior(options);

    return loadScript(options.gsapUrl)
      .then(function () { return loadScript(options.splitTypeUrl); })
      .catch(function () {
        return null;
      });
  }

  global.PrimlandRevealSuite = {
    init: init,
    defaults: Object.assign({}, DEFAULTS)
  };
})(window);
