(function (global) {
  "use strict";

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isVisibleNode(node) {
    if (!node) return false;
    if (!node.getClientRects().length) return false;
    var style = global.getComputedStyle(node);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function createBlock(config) {
    var wrapper = document.createElement("section");
    wrapper.className = "altai-sticky-wrapper";
    wrapper.id = config.blockId;

    var scene = document.createElement("div");
    scene.className = "altai-sticky-scene";

    var video = document.createElement("video");
    video.className = "altai-sticky-bg";
    video.src = config.backgroundVideo;
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";

    var fade = document.createElement("div");
    fade.className = "altai-sticky-fade";

    var title = document.createElement("div");
    title.className = "altai-sticky-title";
    title.innerHTML =
      '<p class="altai-sticky-kicker ' +
      (config.kickerClass || "") +
      '">' +
      config.kicker +
      '</p><h2 class="altai-sticky-heading altai-sticky-reveal-title">' +
      config.headingHtml +
      "</h2>";

    var card = document.createElement("article");
    card.className = "altai-sticky-card";
    card.innerHTML =
      '<img class="altai-sticky-card-image" alt=""><p class="altai-sticky-card-text"></p>';

    var dots = document.createElement("div");
    dots.className = "altai-sticky-dots";
    config.cards.forEach(function (_, index) {
      var dot = document.createElement("span");
      dot.className = "altai-sticky-dot" + (index === 0 ? " is-active" : "");
      dots.appendChild(dot);
    });

    scene.appendChild(video);
    scene.appendChild(fade);
    scene.appendChild(title);
    scene.appendChild(card);
    scene.appendChild(dots);
    wrapper.appendChild(scene);

    wrapper.style.setProperty("--altai-card-right", config.cardRightPx + "px");
    wrapper.style.setProperty("--altai-card-width", config.cardWidthPx + "px");
    return wrapper;
  }

  function initRevealIfPossible(titleNode) {
    if (!titleNode) return;
    if (titleNode.dataset.altaiRevealReady === "1") return;
    titleNode.dataset.altaiRevealReady = "1";

    if (global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    function run(attempt) {
      var hasLibs = !!global.gsap && !!global.SplitType;
      if (!hasLibs && attempt < 30) {
        global.setTimeout(function () {
          run(attempt + 1);
        }, 100);
        return;
      }
      if (!hasLibs) return;

      titleNode.style.opacity = "0";
      titleNode.style.filter = "blur(.15em)";

      function animateNow() {
        if (titleNode.dataset.altaiRevealAnimated === "1") return;
        titleNode.dataset.altaiRevealAnimated = "1";
        titleNode.style.opacity = "1";
        titleNode.style.filter = "none";
        var split = new global.SplitType(titleNode, { types: "words" });
        global.gsap.fromTo(
          split.words,
          { alpha: 0, filter: "blur(.15em)" },
          { alpha: 1, filter: "blur(0em)", stagger: 0.125, duration: 1.5, delay: 0.5 }
        );
      }

      if ("IntersectionObserver" in global) {
        var observer = new IntersectionObserver(function (entries, obs) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            obs.unobserve(entry.target);
            animateNow();
          });
        }, { threshold: 0, rootMargin: "0px 0px 0px 0px" });
        observer.observe(titleNode);
      } else {
        animateNow();
      }
    }

    run(0);
  }

  function init(userConfig) {
    var config = Object.assign({
      blockId: "altaiStickyBlock",
      replaceSelector: "div.css-uk8455.css-5knerd",
      replaceAllBreakpoints: true,
      backgroundVideo: "https://storage.yandexcloud.net/pears/river.mp4",
      kicker: "алтай",
      headingHtml: "Место силы<br>и вдохновения",
      kickerClass: "tune-smallcaps-lead",
      blockHeightPx: 5000,
      cardRightPx: 156,
      cardWidthPx: 460,
      cardHoldPortion: 0.82,
      cards: []
    }, userConfig || {});

    if (!Array.isArray(config.cards) || !config.cards.length) {
      throw new Error("AltaiStickyBlock: config.cards must be a non-empty array");
    }
    if (global.__altaiStickyReuseInitialized === true) return;

    var rawTargets = Array.from(document.querySelectorAll(config.replaceSelector));
    if (!rawTargets.length) return;
    var targets;
    if (config.replaceAllBreakpoints) {
      var seen = new Set();
      targets = rawTargets.filter(function (node) {
        if (!node || node.closest(".altai-sticky-wrapper")) return false;
        if (seen.has(node)) return false;
        seen.add(node);
        return true;
      });
    } else {
      var one = rawTargets.find(isVisibleNode) || rawTargets[0] || null;
      targets = one ? [one] : [];
    }
    if (!targets.length) return;

    var container = document.getElementById("container") || document.body;

    function initSingle(block, replacedHeight, breakpointRoot) {
      if (breakpointRoot) {
        var delta = Math.max(0, config.blockHeightPx - replacedHeight);
        var styleHeight = parseFloat(breakpointRoot.style.height || "0");
        if (Number.isFinite(styleHeight) && styleHeight > 0) {
          breakpointRoot.style.height = String(Math.ceil(styleHeight + delta)) + "px";
        }
        global.requestAnimationFrame(function () {
          var needed = breakpointRoot.scrollHeight;
          if (needed > breakpointRoot.clientHeight) {
            breakpointRoot.style.height = String(needed) + "px";
          }
        });
      }

      var scene = block.querySelector(".altai-sticky-scene");
      var cardNode = block.querySelector(".altai-sticky-card");
      var imageNode = block.querySelector(".altai-sticky-card-image");
      var textNode = block.querySelector(".altai-sticky-card-text");
      var dots = Array.from(block.querySelectorAll(".altai-sticky-dot"));
      var titleNode = block.querySelector(".altai-sticky-reveal-title");
      var prefersReducedMotion = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches;
      var stepCount = Math.max(config.cards.length - 1, 1);
      var activeIndex = -1;
      var fadeTimer = 0;
      var ticking = false;

      function applyCard(index) {
        var item = config.cards[index];
        if (!item || index === activeIndex) return;
        activeIndex = index;
        cardNode.style.backgroundColor = item.bg;
        dots.forEach(function (dot, dotIndex) {
          dot.classList.toggle("is-active", dotIndex === index);
        });
        if (prefersReducedMotion) {
          imageNode.src = item.image;
          textNode.textContent = item.text;
          return;
        }
        if (fadeTimer) global.clearTimeout(fadeTimer);
        cardNode.classList.add("is-fading");
        fadeTimer = global.setTimeout(function () {
          imageNode.src = item.image;
          textNode.textContent = item.text;
          cardNode.classList.remove("is-fading");
          fadeTimer = 0;
        }, 180);
      }

      function updateHeight() {
        block.style.height = String(config.blockHeightPx) + "px";
        block.style.minHeight = String(config.blockHeightPx) + "px";
        if (scene) {
          scene.style.position = "sticky";
          scene.style.top = "0";
        }
      }

      function onScroll() {
        var rect = block.getBoundingClientRect();
        var maxScroll = Math.max(block.offsetHeight - global.innerHeight, 1);
        var progress = clamp(-rect.top / maxScroll, 0, 1);
        var exactRaw = clamp(progress * stepCount, 0, stepCount);
        var step = Math.floor(exactRaw);
        var local = exactRaw - step;
        var transitionProgress = clamp(
          (local - config.cardHoldPortion) / (1 - config.cardHoldPortion),
          0,
          1
        );
        var nextIndex = Math.min(
          config.cards.length - 1,
          step + (transitionProgress >= 0.75 ? 1 : 0)
        );
        applyCard(nextIndex);
        ticking = false;
      }

      function requestTick() {
        if (ticking) return;
        ticking = true;
        global.requestAnimationFrame(onScroll);
      }

      updateHeight();
      applyCard(0);
      requestTick();
      initRevealIfPossible(titleNode);

      global.addEventListener("scroll", requestTick, { passive: true });
      global.addEventListener("resize", function () {
        updateHeight();
        requestTick();
      }, { passive: true });
    }

    targets.forEach(function (target, index) {
      var block = createBlock(config);
      block.id = config.blockId + "-" + String(index + 1);
      var replacedHeight = target.getBoundingClientRect().height;
      var breakpointRoot = target.closest('[data-breakpoint="true"], .breakpoint');
      if (target && target.parentNode) {
        target.replaceWith(block);
      } else {
        container.appendChild(block);
      }
      initSingle(block, replacedHeight, breakpointRoot);
    });

    global.__altaiStickyReuseInitialized = true;
  }

  global.AltaiStickyBlock = {
    init: init
  };
})(window);
