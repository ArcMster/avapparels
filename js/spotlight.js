// Spotlight: a swipeable 3D card carousel with a rotating text ring and a starfield.
// Content comes from Django admin (Spotlights). Works with touch, mouse drag,
// trackpad swipe, arrow keys, dots and prev/next buttons.
import { money } from "./api.js";
import { esc } from "./ui.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function spotlightHtml(s) {
  const shop = s.collection_slug ? `collection.html?slug=${encodeURIComponent(s.collection_slug)}` : "collection.html";
  return `
  <section class="spot" id="spot" style="--accent:${esc(s.accent_colour)};--pill:${esc(s.pill_colour)}" aria-label="${esc(s.title)}">
    ${s.show_stars ? '<div class="spot-stars" aria-hidden="true"></div>' : ""}
    <div class="wrap spot-grid">
      <div class="spot-copy">
        ${s.eyebrow ? `<span class="spot-pill">${esc(s.eyebrow)}</span>` : ""}
        <h2 class="spot-title">${esc(s.title)}${s.highlight ? `<span>${esc(s.highlight)}</span>` : ""}</h2>
        ${s.description ? `<p>${esc(s.description)}</p>` : ""}
        <div class="hero-actions">
          ${s.cta_text ? `<a class="btn spot-cta" href="${shop}">${esc(s.cta_text)}</a>` : ""}
          <a class="btn btn-ghost" href="customize.html">Design your own</a>
        </div>
      </div>
      <div class="spot-stage" tabindex="0" role="region" aria-roledescription="carousel" aria-label="Featured tees. Use arrow keys or swipe.">
        <div class="spot-glow" aria-hidden="true"></div>
        ${s.ring_text ? ringSvg(s.ring_text) : ""}
        <div class="spot-track">
          ${s.cards.map((c, i) => cardHtml(c, i, s.cards.length)).join("")}
        </div>
      </div>
    </div>
    <div class="spot-controls">
      <button class="spot-arrow" data-dir="-1" aria-label="Previous">‹</button>
      <div class="spot-dots" role="tablist">${s.cards.map((c, i) => `<button role="tab" aria-label="${esc(c.name)}" data-go="${i}"></button>`).join("")}</div>
      <button class="spot-arrow" data-dir="1" aria-label="Next">›</button>
    </div>
    <p class="spot-live sr-only" aria-live="polite"></p>
  </section>`;
}

function cardHtml(c, i, total) {
  return `<a class="spot-card" href="product.html?slug=${encodeURIComponent(c.slug)}" data-i="${i}" aria-label="${esc(c.name)}, ${money(c.price)}, ${i + 1} of ${total}" draggable="false"><div class="spot-card-inner">
    <div class="spot-card-light" aria-hidden="true"></div>
    ${c.image ? `<img src="${esc(c.image)}" alt="" draggable="false" loading="${i < 3 ? "eager" : "lazy"}">` : ""}
    <div class="spot-card-info">
      <span class="spot-name">${esc(c.name)}</span>
      <span class="spot-price">${money(c.price)}${c.compare_at_price ? `<s>${money(c.compare_at_price)}</s>` : ""}</span>
    </div>
  </div></a>`;
}

function ringSvg(text) {
  // Repeat the phrase so it wraps the whole circle, then let SVG space it evenly.
  const clean = text.trim().replace(/\s+/g, " ");
  const reps = Math.max(1, Math.round(70 / Math.max(clean.length, 10)));
  const full = Array.from({ length: reps }, () => clean).join("  ");
  return `<div class="spot-ring" aria-hidden="true"><svg viewBox="0 0 100 100">
    <defs><path id="spot-ring-path" d="M50,50 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0"/></defs>
    <text><textPath href="#spot-ring-path" textLength="274" lengthAdjust="spacing">${esc(full)}</textPath></text>
  </svg></div>`;
}

export function initSpotlight(root, s) {
  const cards = [...root.querySelectorAll(".spot-card")];
  const dots = [...root.querySelectorAll(".spot-dots button")];
  const stage = root.querySelector(".spot-stage");
  const ring = root.querySelector(".spot-ring svg");
  const live = root.querySelector(".spot-live");
  const n = cards.length;
  let index = 0;
  let drag = null;
  let suppressClick = false;
  let timer = null;

  if (root.querySelector(".spot-stars")) makeStars(root.querySelector(".spot-stars"));

  // Shortest signed distance on a loop, so the deck wraps around.
  const offsetOf = (i, pos) => {
    let d = i - pos;
    if (n > 2) {
      if (d > n / 2) d -= n;
      if (d < -n / 2) d += n;
    }
    return d;
  };

  function layout(pos = index) {
    const step = stage.clientWidth < 520 ? 52 : 58; // % of card width between cards
    cards.forEach((card, i) => {
      const d = offsetOf(i, pos);
      const a = Math.abs(d);
      const visible = a < 2.6;
      card.style.transform =
        `translate(-50%, -50%) translateX(${d * step}%) translateZ(${-a * 140}px) rotateY(${-d * 22}deg) rotateZ(${d * 5}deg) scale(${1 - Math.min(a, 2.5) * 0.11})`;
      card.style.zIndex = String(100 - Math.round(a * 10));
      card.style.opacity = visible ? String(1 - Math.max(0, a - 1.6) * 0.9) : "0";
      card.style.filter = `brightness(${1 - Math.min(a, 2) * 0.28}) saturate(${1 - Math.min(a, 2) * 0.15})`;
      card.style.pointerEvents = visible ? "" : "none";
      card.classList.toggle("is-active", Math.round(a * 100) === 0);
      card.tabIndex = i === index ? 0 : -1;
      card.setAttribute("aria-hidden", i === index ? "false" : "true");
    });
    if (ring) ring.style.transform = `rotate(${-pos * (360 / Math.max(n, 6))}deg)`;
  }

  function go(i, announce = true) {
    index = ((i % n) + n) % n;
    root.classList.remove("dragging");
    layout();
    dots.forEach((d, k) => d.setAttribute("aria-selected", String(k === index)));
    if (announce) live.textContent = `${s.cards[index].name}, ${money(s.cards[index].price)}`;
  }

  // --- autoplay -----------------------------------------------------------
  const autoplayMs = (s.autoplay_seconds || 0) * 1000;
  function play() {
    stop();
    if (!autoplayMs || reduceMotion || n < 2) return;
    timer = setInterval(() => {
      if (document.visibilityState === "visible") go(index + 1, false);
    }, autoplayMs);
  }
  function stop() {
    clearInterval(timer);
    timer = null;
  }
  root.addEventListener("mouseenter", stop);
  root.addEventListener("mouseleave", play);
  root.addEventListener("focusin", stop);
  root.addEventListener("focusout", play);

  // --- buttons, dots, keys --------------------------------------------------
  root.querySelectorAll(".spot-arrow").forEach((b) => b.addEventListener("click", () => go(index + Number(b.dataset.dir))));
  dots.forEach((d) => d.addEventListener("click", () => go(Number(d.dataset.go))));
  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(index + 1);
    else if (e.key === "ArrowLeft") go(index - 1);
    else return;
    e.preventDefault();
  });

  // Clicking a side card brings it to the front instead of opening it.
  cards.forEach((card, i) =>
    card.addEventListener("click", (e) => {
      if (suppressClick || i !== index) {
        e.preventDefault();
        if (!suppressClick) go(i);
      }
    })
  );

  // --- drag and swipe ----------------------------------------------------------
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false, width: cards[0].offsetWidth || 260 };
    suppressClick = false;
    stop();
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) {
      tilt(e);
      return;
    }
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) {
        drag = null; // vertical scroll, let the page move
        return;
      }
      if (Math.abs(dx) < 6) return;
      drag.moved = true;
      stage.setPointerCapture(e.pointerId);
      root.classList.add("dragging");
    }
    layout(index - dx / (drag.width * 0.65));
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.moved) {
      const dx = e.clientX - drag.x;
      const steps = Math.round(-dx / (drag.width * 0.65));
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 50);
      go(index + (steps || (Math.abs(dx) > 40 ? -Math.sign(dx) : 0)));
    }
    drag = null;
    play();
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  // Trackpad horizontal swipe and shift + wheel.
  let wheelLock = 0;
  stage.addEventListener(
    "wheel",
    (e) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (Math.abs(dx) < 12) return;
      e.preventDefault();
      const now = Date.now();
      if (now < wheelLock) return;
      wheelLock = now + 450;
      go(index + Math.sign(dx));
    },
    { passive: false }
  );

  // Gentle 3D tilt of the front card following the cursor (mouse only).
  function tilt(e) {
    if (e.pointerType !== "mouse" || reduceMotion) return;
    const active = cards[index];
    const r = active.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    const inside = Math.abs(x) < 0.6 && Math.abs(y) < 0.6;
    active.style.setProperty("--tilt-x", inside ? `${(-y * 8).toFixed(2)}deg` : "0deg");
    active.style.setProperty("--tilt-y", inside ? `${(x * 10).toFixed(2)}deg` : "0deg");
  }
  stage.addEventListener("pointerleave", () => {
    cards[index].style.setProperty("--tilt-x", "0deg");
    cards[index].style.setProperty("--tilt-y", "0deg");
  });

  window.addEventListener("resize", () => layout());
  go(0, false);
  requestAnimationFrame(() => root.classList.add("ready"));
  play();
}

function makeStars(el) {
  const count = window.innerWidth < 600 ? 28 : 55;
  el.innerHTML = Array.from({ length: count }, () => {
    const size = Math.random() < 0.15 ? 10 + Math.random() * 6 : 2 + Math.random() * 2.5;
    const sparkle = size > 8;
    return `<i class="${sparkle ? "sparkle" : ""}" style="left:${(Math.random() * 100).toFixed(2)}%;top:${(Math.random() * 100).toFixed(2)}%;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;animation-delay:${(Math.random() * 4).toFixed(2)}s;animation-duration:${(2.5 + Math.random() * 3).toFixed(2)}s"></i>`;
  }).join("");
}
