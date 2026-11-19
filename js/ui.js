import { api, money } from "./api.js";
import { API_BASE } from "./config.js";
import { cart } from "./store.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// Only allow relative links or http(s) URLs from admin-entered content.
export function safeHref(value) {
  const v = String(value || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v) || /^[\w./?=&#-]+$/.test(v)) return esc(v);
  return "";
}

export const params = new URLSearchParams(location.search);

const ICONS = {
  bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.4-.3z"/></svg>',
};

let layoutData = null;

export function whatsappLink(text = "") {
  const number = layoutData?.site?.whatsapp_number;
  if (!number) return "";
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Render header, running messages and footer. Pass data from /home/ to avoid a second call. */
export async function initLayout(data = null, activeKey = "") {
  try {
    layoutData = data || (await api.get("/site/"));
  } catch (err) {
    showFatal(err);
    throw err;
  }
  const { site, announcements, marquee, nav_collections } = layoutData;
  document.title = document.title.replace("AV Apparels", site.store_name);

  renderAnnouncements(announcements);
  const header = $("#site-header");
  header.className = "header";
  header.innerHTML = `
    <div class="wrap header-row">
      <a class="logo" href="index.html" aria-label="${esc(site.store_name)} home">${logoHtml(site.store_name)}</a>
      <nav class="nav" id="nav">
        <a href="collection.html?tag=new" data-key="new">New in</a>
        <a href="collection.html?tag=bestseller" data-key="bestseller">Best sellers</a>
        ${nav_collections.map((c) => `<a href="collection.html?slug=${esc(c.slug)}" data-key="${esc(c.slug)}">${esc(c.name)}</a>`).join("")}
        <a href="collection.html" data-key="all">Shop all</a>
        <a href="customize.html" data-key="custom">Custom design</a>
      </nav>
      <div class="header-actions">
        <a class="btn btn-accent btn-sm" href="customize.html">${ICONS.pen} Design yours</a>
        <a class="icon-btn" href="design-status.html" title="My designs" aria-label="My designs">${ICONS.pen}</a>
        <a class="icon-btn" href="cart.html" title="Cart" aria-label="Cart">${ICONS.bag}<span class="badge-count" id="cart-count" data-count="0">0</span></a>
        <button class="icon-btn menu-toggle" id="menu-toggle" aria-label="Menu">${ICONS.menu}</button>
      </div>
    </div>`;
  if (activeKey) $$(`#nav a[data-key="${CSS.escape(activeKey)}"]`).forEach((a) => a.classList.add("active"));
  $("#menu-toggle").addEventListener("click", () => $("#nav").classList.toggle("open"));

  const marqueeEl = $("#marquee");
  if (marqueeEl) renderMarquee(marqueeEl, marquee);

  renderFooter(site, nav_collections);
  updateCartCount();
  window.addEventListener("av:storage", updateCartCount);
  window.addEventListener("storage", updateCartCount);
  return layoutData;
}

function logoHtml(name) {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length < 2) return esc(name);
  return `${esc(parts[0])}<span>${esc(parts.slice(1).join(" "))}</span>`;
}

function renderAnnouncements(list) {
  const el = $("#announce");
  if (!el) return;
  if (!list.length) {
    el.remove();
    return;
  }
  el.className = "announce";
  el.innerHTML = list
    .map((m, i) => {
      const href = safeHref(m.link);
      const text = esc(m.text);
      return `<div class="announce-item${i === 0 ? " on" : ""}">${href ? `<a href="${href}">${text}</a>` : text}</div>`;
    })
    .join("");
  if (list.length > 1) {
    let i = 0;
    const items = $$(".announce-item", el);
    setInterval(() => {
      items[i].classList.remove("on");
      i = (i + 1) % items.length;
      items[i].classList.add("on");
    }, 4000);
  }
}

export function renderMarquee(el, list, accent = false) {
  if (!list.length) {
    el.remove();
    return;
  }
  el.className = `marquee${accent ? " accent" : ""}`;
  // Repeat enough times to fill wide screens, then duplicate for a seamless loop.
  const reps = Math.max(2, Math.ceil(10 / list.length));
  const one = Array.from({ length: reps }, () =>
    list.map((m) => {
      const href = safeHref(m.link);
      return href ? `<a class="marquee-item" href="${href}">${esc(m.text)}</a>` : `<span class="marquee-item">${esc(m.text)}</span>`;
    }).join("")
  ).join("");
  el.innerHTML = `<div class="marquee-track" aria-hidden="true">${one}${one}</div><span class="sr-only">${list.map((m) => esc(m.text)).join(". ")}</span>`;
}

function renderFooter(site, collections) {
  const footer = $("#site-footer");
  if (!footer) return;
  const wa = whatsappLink(`Hi ${site.store_name}, I have a question.`);
  footer.className = "footer";
  footer.innerHTML = `
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <a class="logo" href="index.html" style="color:#fff">${logoHtml(site.store_name)}</a>
          <p style="max-width:320px">${esc(site.footer_about)}</p>
        </div>
        <div><h4>Shop</h4><ul>
          <li><a href="collection.html?tag=new">New in</a></li>
          <li><a href="collection.html?tag=bestseller">Best sellers</a></li>
          ${collections.map((c) => `<li><a href="collection.html?slug=${esc(c.slug)}">${esc(c.name)}</a></li>`).join("")}
        </ul></div>
        <div><h4>Custom tees</h4><ul>
          <li><a href="customize.html">Design your tee</a></li>
          <li><a href="design-status.html">Track my designs</a></li>
          <li><a href="cart.html">Cart</a></li>
        </ul></div>
        <div><h4>Contact</h4><ul>
          ${wa ? `<li><a href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp us</a></li>` : ""}
          ${site.contact_email ? `<li><a href="mailto:${esc(site.contact_email)}">${esc(site.contact_email)}</a></li>` : ""}
          ${site.contact_phone ? `<li>${esc(site.contact_phone)}</li>` : ""}
          ${site.instagram_url ? `<li><a href="${safeHref(site.instagram_url)}" target="_blank" rel="noopener">Instagram</a></li>` : ""}
        </ul></div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} ${esc(site.store_name)}. ${esc(site.tagline)}</span>
        <span>Demo storefront. Payments are not taken online.</span>
      </div>
    </div>`;
  if (wa) {
    const a = document.createElement("a");
    a.className = "wa-float";
    a.href = wa;
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", "Chat on WhatsApp");
    a.innerHTML = ICONS.wa;
    document.body.appendChild(a);
  }
}

export function updateCartCount() {
  const el = $("#cart-count");
  if (!el) return;
  const n = cart.count();
  el.textContent = n;
  el.dataset.count = n;
}

function showFatal(err) {
  const main = $("main") || document.body;
  main.innerHTML = `<div class="api-error">
    <h1 class="display" style="font-size:48px">Store is waking up</h1>
    <p class="muted">${esc(err.message)}</p>
    <p class="muted" style="font-size:13px">API: <code>${esc(API_BASE)}</code>. If you just deployed, check <code>js/config.js</code> and the CORS settings on the server.</p>
    <button class="btn" onclick="location.reload()">Try again</button></div>`;
}

export function toast(message, { link = "", linkText = "", bad = false } = {}) {
  let wrap = $(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    wrap.setAttribute("role", "status");
    document.body.appendChild(wrap);
  }
  const t = document.createElement("div");
  t.className = `toast${bad ? " bad" : ""}`;
  t.innerHTML = `<span>${esc(message)}</span>${link ? `<a href="${esc(link)}">${esc(linkText)}</a>` : ""}`;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 3800);
}

// ---------------------------------------------------------------------------
// Product cards with inline colour and size pickers
// ---------------------------------------------------------------------------
const cardCache = new Map();

export function productCard(p) {
  cardCache.set(p.slug, p);
  const url = `product.html?slug=${encodeURIComponent(p.slug)}`;
  const savings = Number(p.savings || 0);
  const badges = [
    p.badge_text ? `<span class="tag">${esc(p.badge_text)}</span>` : "",
    savings > 0 ? `<span class="tag save">Save ${money(savings)}</span>` : "",
    !p.in_stock ? `<span class="tag soft">Sold out</span>` : "",
  ].join("");
  const colour0 = p.default_colour || p.colours[0]?.name || "";
  return `
  <article class="card" data-slug="${esc(p.slug)}" data-colour="${esc(colour0)}" data-size="">
    <a class="card-media" href="${url}">
      <div class="card-badges">${badges}</div>
      ${p.image ? `<img class="main${p.hover_image ? " has-hover" : ""}" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : ""}
      ${p.hover_image ? `<img class="hover" src="${esc(p.hover_image)}" alt="" loading="lazy">` : ""}
    </a>
    <div class="card-body">
      <div>
        <a class="card-title" href="${url}">${esc(p.name)}</a>
        <div class="card-sub">${esc(p.short_description || p.fit)}</div>
      </div>
      <div class="price-row"><span class="price">${money(p.price)}</span>${p.compare_at_price ? `<span class="compare">${money(p.compare_at_price)}</span>` : ""}</div>
      ${p.colours.length ? `<div class="swatches">${p.colours.map((c) => `<button class="swatch${c.name === colour0 ? " on" : ""}" style="background:${esc(c.hex_code)}" title="${esc(c.name)}" aria-label="${esc(c.name)}" data-colour="${esc(c.name)}"></button>`).join("")}</div>` : ""}
      ${p.sizes.length ? `<div class="sizes">${p.sizes.map((s) => `<button class="size-btn" data-size="${esc(s.name)}">${esc(s.name)}</button>`).join("")}</div>` : ""}
      <div class="card-actions"><button class="btn btn-sm btn-block" data-add ${p.in_stock ? "" : "disabled"}>${p.in_stock ? "Add to cart" : "Sold out"}</button></div>
    </div>
  </article>`;
}

let cardsBound = false;
export function bindCards() {
  if (cardsBound) return;
  cardsBound = true;
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".card[data-slug]");
    if (!card) return;
    const sw = e.target.closest(".swatch");
    const sz = e.target.closest(".size-btn");
    if (sw) {
      $$(".swatch", card).forEach((b) => b.classList.toggle("on", b === sw));
      card.dataset.colour = sw.dataset.colour;
      const p = cardCache.get(card.dataset.slug);
      const src = p.colour_images?.[sw.dataset.colour];
      const img = $("img.main", card);
      if (src && img) img.src = src;
    } else if (sz) {
      $$(".size-btn", card).forEach((b) => b.classList.toggle("on", b === sz));
      card.dataset.size = sz.dataset.size;
    } else if (e.target.closest("[data-add]")) {
      const p = cardCache.get(card.dataset.slug);
      if (p.sizes.length && !card.dataset.size) {
        toast("Pick a size first", { bad: true });
        $(".sizes", card)?.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }], { duration: 250 });
        return;
      }
      cart.addProduct(p, card.dataset.colour, card.dataset.size, 1);
      toast(`${p.name} added (${[card.dataset.colour, card.dataset.size].filter(Boolean).join(", ")})`, { link: "cart.html", linkText: "View cart" });
    }
  });
}

export function skeletonCards(n = 4) {
  return Array.from({ length: n }, () => '<div class="skeleton sk-card"></div>').join("");
}
