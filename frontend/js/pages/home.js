import { api } from "../api.js";
import { $, bindCards, esc, initLayout, productCard, renderMarquee, safeHref, toast } from "../ui.js";
import { initSpotlight, spotlightHtml } from "../spotlight.js";

const data = await api.get("/home/").catch((err) => err);
if (data instanceof Error) {
  await initLayout(null).catch(() => {});
  throw data;
}
await initLayout(data);
bindCards();

const { site, offers, features, tiles, new_arrivals, bestsellers, sections, marquee, spotlight } = data;
const showHero = !(spotlight && spotlight.hide_main_hero);
const totalDesigns = tiles.reduce((n, t) => n + (t.product_count || 0), 0);

const productRow = (title, sub, products, link, eyebrow = "") =>
  products.length
    ? `<section class="section"><div class="wrap">
        <div class="section-head">
          <div>${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ""}<h2 class="display">${title}</h2>${sub ? `<p>${esc(sub)}</p>` : ""}</div>
          <a class="link-arrow" href="${link}">View all →</a>
        </div>
        <div class="grid">${products.map(productCard).join("")}</div>
      </div></section>`
    : "";

$("#home").innerHTML = `
  ${spotlight ? spotlightHtml(spotlight) : ""}
  ${showHero ? `<section class="hero">
    <div class="wrap hero-grid">
      <div>
        ${site.hero_eyebrow ? `<span class="eyebrow">${esc(site.hero_eyebrow)}</span>` : ""}
        <h1 class="display">${esc(site.hero_title)}${site.hero_highlight ? ` <em>${esc(site.hero_highlight)}</em>` : ""}</h1>
        <p>${esc(site.hero_subtitle)}</p>
        <div class="hero-actions">
          <a class="btn btn-accent" href="${safeHref(site.hero_cta_link) || "collection.html"}">${esc(site.hero_cta_text)}</a>
          <a class="btn btn-ghost" href="customize.html">Design your own</a>
        </div>
        <div class="hero-stats">
          <div><strong>240</strong><span>GSM cotton</span></div>
          <div><strong>${totalDesigns}+</strong><span>Designs</span></div>
          <div><strong>3-5</strong><span>Day delivery</span></div>
        </div>
      </div>
      <div class="hero-media">${site.hero_image ? `<img src="${esc(site.hero_image)}" alt="${esc(site.store_name)} tees">` : ""}</div>
    </div>
  </section>` : ""}
  <div id="home-marquee"></div>

  ${productRow("New <em>arrivals</em>", "Fresh off the press this week.", new_arrivals, "collection.html?tag=new", "Just dropped")}

  ${offers.length ? `<section class="section" style="padding-top:0"><div class="wrap"><div class="offers">${offers.map(offerCard).join("")}</div></div></section>` : ""}

  ${tiles.length ? `<section class="section" style="background:var(--paper-2)"><div class="wrap">
      <div class="section-head"><div><span class="eyebrow">Find your vibe</span><h2 class="display">Shop by <em>theme</em></h2></div><a class="link-arrow" href="collection.html">Shop all →</a></div>
      <div class="tiles">${tiles.map(tileCard).join("")}</div>
    </div></section>` : ""}

  ${productRow("Best <em>sellers</em>", "What everyone is wearing right now.", bestsellers, "collection.html?tag=bestseller", "Most loved")}

  ${sections.filter((s) => s.products.length).map((s) => productRow(esc(s.name), s.description, s.products, `collection.html?slug=${encodeURIComponent(s.slug)}`, s.eyebrow)).join("")}

  <section class="section"><div class="wrap">
    <div class="custom-cta">
      <div>
        <span class="eyebrow" style="color:var(--on-dark-muted)">Custom studio</span>
        <h2 class="display">${esc(site.custom_section_title).replace(/(\S+)$/, "<em>$1</em>")}</h2>
        <p>${esc(site.custom_section_text)}</p>
        <a class="btn btn-accent" href="customize.html">Start designing</a>
      </div>
      <div class="steps">
        <div class="step"><b>01</b><div><strong>Pick fit, colour and size</strong><span>Oversized, regular or acid wash.</span></div></div>
        <div class="step"><b>02</b><div><strong>Upload your artwork</strong><span>Place it on the front, back or both.</span></div></div>
        <div class="step"><b>03</b><div><strong>We approve it</strong><span>Our team checks the print and confirms the price.</span></div></div>
        <div class="step"><b>04</b><div><strong>Order and wear</strong><span>Add the approved tee to your cart and check out.</span></div></div>
      </div>
    </div>
  </div></section>

  ${features.length ? `<section class="section" style="padding-top:0"><div class="wrap">
      <div class="section-head"><div><span class="eyebrow">Why ${esc(site.store_name)}</span><h2 class="display">Made <em>heavy</em>, made right</h2></div></div>
      <div class="features">${features.map((f) => `<div class="feature"><div class="ico">${esc(f.icon)}</div><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></div>`).join("")}</div>
    </div></section>` : ""}
`;

renderMarquee($("#home-marquee"), marquee, true);
if (spotlight) initSpotlight($("#spot"), spotlight);

$("#home").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-copy]");
  if (!btn) return;
  try {
    await navigator.clipboard.writeText(btn.dataset.copy);
    toast(`Code ${btn.dataset.copy} copied. Use it at checkout.`);
  } catch {
    toast(`Use code ${btn.dataset.copy} at checkout.`);
  }
});

function offerCard(o) {
  const href = safeHref(o.link);
  return `<div class="offer">
    ${o.badge_text ? `<span class="tag">${esc(o.badge_text)}</span>` : ""}
    <h3>${esc(o.title)}</h3>
    ${o.subtitle ? `<p>${esc(o.subtitle)}</p>` : ""}
    ${o.coupon_code ? `<button class="code" data-copy="${esc(o.coupon_code)}" title="Copy code">${esc(o.coupon_code)}</button>` : href ? `<a class="link-arrow" style="margin-top:auto;align-self:flex-start;border-color:currentColor" href="${href}">Explore →</a>` : ""}
  </div>`;
}

function tileCard(c) {
  return `<a class="tile" href="collection.html?slug=${encodeURIComponent(c.slug)}">
    ${c.image ? `<img src="${esc(c.image)}" alt="${esc(c.name)}" loading="lazy">` : ""}
    <div class="tile-body"><span>${c.product_count} designs</span><h3 class="display">${esc(c.name)}</h3></div>
  </a>`;
}


