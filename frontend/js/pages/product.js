import { api, money } from "../api.js";
import { cart } from "../store.js";
import { $, $$, bindCards, esc, initLayout, params, productCard, toast, whatsappLink } from "../ui.js";

const slug = params.get("slug");
const [layout, product] = await Promise.all([
  initLayout(null),
  slug ? api.get(`/products/${encodeURIComponent(slug)}/`).catch(() => null) : null,
]);
bindCards();

if (!product) {
  $("#page").innerHTML = `<div class="empty wrap"><h2 class="display">Product not found</h2><p><a class="btn" href="collection.html">Back to shop</a></p></div>`;
} else {
  render(product);
}

function render(p) {
  document.title = `${p.name} | ${layout.site.store_name}`;
  const state = { colour: p.default_colour || p.colours[0]?.name || "", size: "", qty: 1, image: 0 };
  const images = p.images.length ? p.images : [{ url: p.image, alt: p.name }];
  const savings = Number(p.savings || 0);
  const coll = p.collections[0];
  const wa = whatsappLink(`Hi, I need help with sizing for ${p.name}.`);

  $("#page").innerHTML = `
  <div class="wrap">
    <div class="crumbs" style="color:var(--muted);margin-top:24px"><a href="index.html">Home</a> / ${coll ? `<a href="collection.html?slug=${encodeURIComponent(coll.slug)}">${esc(coll.name)}</a> / ` : ""}${esc(p.name)}</div>
    <div class="pdp">
      <div class="gallery">
        <div class="thumbs">${images.map((img, i) => `<button data-i="${i}" class="${i === 0 ? "on" : ""}" aria-label="Image ${i + 1}"><img src="${esc(img.url)}" alt=""></button>`).join("")}</div>
        <div class="main-img"><img id="main-img" src="${esc(images[0].url || "")}" alt="${esc(images[0].alt || p.name)}"></div>
      </div>
      <div>
        <div class="card-badges" style="position:static;margin-bottom:12px">
          ${p.badge_text ? `<span class="tag">${esc(p.badge_text)}</span>` : ""}
          ${savings > 0 ? `<span class="tag save">Save ${money(savings)}</span>` : ""}
        </div>
        <h1 class="display">${esc(p.name)}</h1>
        <p class="muted">${esc(p.fit)} fit · ${esc(p.fabric)}</p>
        <div class="price-row"><span class="price">${money(p.price)}</span>${p.compare_at_price ? `<span class="compare">${money(p.compare_at_price)}</span>` : ""}<span class="muted" style="font-size:12px">Inclusive of taxes</span></div>

        ${p.colours.length ? `<div class="opt"><div class="opt-label">Colour <span id="colour-name">${esc(state.colour)}</span></div>
          <div class="swatches" id="colours">${p.colours.map((c) => `<button class="swatch lg${c.name === state.colour ? " on" : ""}" style="background:${esc(c.hex_code)}" data-colour="${esc(c.name)}" title="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`).join("")}</div></div>` : ""}

        ${p.sizes.length ? `<div class="opt"><div class="opt-label">Size <span>${wa ? `<a class="link-arrow" style="font-size:12px" href="${esc(wa)}" target="_blank" rel="noopener">Size help on WhatsApp</a>` : ""}</span></div>
          <div class="sizes" id="sizes">${p.sizes.map((s) => `<button class="size-btn lg" data-size="${esc(s.name)}">${esc(s.name)}</button>`).join("")}</div></div>` : ""}

        <div class="opt"><div class="opt-label">Quantity</div>
          <div class="buy-row">
            <div class="qty"><button data-q="-1" aria-label="Less">−</button><input id="qty" value="1" inputmode="numeric" aria-label="Quantity"><button data-q="1" aria-label="More">+</button></div>
            <button class="btn" id="add" ${p.in_stock ? "" : "disabled"}>${p.in_stock ? "Add to cart" : "Sold out"}</button>
            <button class="btn btn-accent" id="buy" ${p.in_stock ? "" : "disabled"}>Buy it now</button>
          </div>
        </div>

        <div class="info-list">
          <details open><summary>Description</summary><p>${esc(p.description || p.short_description)}</p></details>
          ${p.sizes.some((s) => s.chest_inches) ? `<details><summary>Size chart</summary>
            <table class="size-table"><tr><th>Size</th>${p.sizes.map((s) => `<td>${esc(s.name)}</td>`).join("")}</tr>
            <tr><th>Chest (in)</th>${p.sizes.map((s) => `<td>${esc(s.chest_inches || "-")}</td>`).join("")}</tr></table></details>` : ""}
          <details><summary>Shipping and exchange</summary><p>Dispatched within 48 hours. Free shipping above ${money(layout.site.free_shipping_threshold)}. Size exchange within 7 days of delivery.</p></details>
        </div>
      </div>
    </div>
  </div>
  ${p.related.length ? `<section class="section" style="padding-top:0"><div class="wrap"><div class="section-head"><h2 class="display">You may <em>also like</em></h2></div><div class="grid">${p.related.map(productCard).join("")}</div></div></section>` : ""}`;

  const setImage = (i) => {
    state.image = i;
    $("#main-img").src = images[i].url;
    $$(".thumbs button").forEach((b) => b.classList.toggle("on", Number(b.dataset.i) === i));
  };
  $(".thumbs").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) setImage(Number(b.dataset.i));
  });
  $("#colours")?.addEventListener("click", (e) => {
    const b = e.target.closest(".swatch");
    if (!b) return;
    state.colour = b.dataset.colour;
    $$("#colours .swatch").forEach((x) => x.classList.toggle("on", x === b));
    $("#colour-name").textContent = state.colour;
    const match = images.findIndex((img) => img.colour === state.colour);
    if (match >= 0) setImage(match);
  });
  $("#sizes")?.addEventListener("click", (e) => {
    const b = e.target.closest(".size-btn");
    if (!b) return;
    state.size = b.dataset.size;
    $$("#sizes .size-btn").forEach((x) => x.classList.toggle("on", x === b));
  });
  $$("[data-q]").forEach((b) =>
    b.addEventListener("click", () => {
      const v = Math.min(20, Math.max(1, (parseInt($("#qty").value, 10) || 1) + Number(b.dataset.q)));
      $("#qty").value = v;
    })
  );
  const add = () => {
    if (p.sizes.length && !state.size) {
      toast("Pick a size first", { bad: true });
      return false;
    }
    const qty = Math.min(20, Math.max(1, parseInt($("#qty").value, 10) || 1));
    cart.addProduct(p, state.colour, state.size, qty, images.find((img) => img.colour === state.colour)?.url);
    return true;
  };
  $("#add").addEventListener("click", () => add() && toast(`${p.name} added to cart`, { link: "cart.html", linkText: "View cart" }));
  $("#buy").addEventListener("click", () => add() && (location.href = "cart.html"));
}
