import { api } from "../api.js";
import { $, bindCards, esc, initLayout, params, productCard, skeletonCards } from "../ui.js";

$("#sk").innerHTML = skeletonCards(8);

const slug = params.get("slug");
const tag = params.get("tag");
const q = params.get("q") || "";
const activeKey = slug || tag || "all";

const layout = await initLayout(null, activeKey);
bindCards();

let title = "Shop <em>all</em>";
let description = "Every design we make, heavyweight and ready to wear.";
let products = [];

if (slug) {
  const collection = await api.get(`/collections/${encodeURIComponent(slug)}/`).catch(() => null);
  if (collection) {
    title = esc(collection.name);
    description = collection.description;
    products = collection.products;
    document.title = `${collection.name} | ${layout.site.store_name}`;
  } else {
    title = "Not <em>found</em>";
    description = "This collection is not available.";
  }
} else {
  const query = new URLSearchParams();
  if (tag) query.set("tag", tag);
  if (q) query.set("q", q);
  products = await api.get(`/products/?${query}`);
  if (tag === "new") [title, description] = ["New <em>in</em>", "The latest drops, newest first."];
  if (tag === "bestseller") [title, description] = ["Best <em>sellers</em>", "Our most loved tees."];
  if (q) [title, description] = [`Results for <em>${esc(q)}</em>`, `${products.length} designs found.`];
}

const chips = [
  { key: "all", label: "All", href: "collection.html" },
  { key: "new", label: "New in", href: "collection.html?tag=new" },
  { key: "bestseller", label: "Best sellers", href: "collection.html?tag=bestseller" },
  ...layout.nav_collections.map((c) => ({ key: c.slug, label: c.name, href: `collection.html?slug=${encodeURIComponent(c.slug)}` })),
];

$("#page").innerHTML = `
  <section class="page-head"><div class="wrap">
    <div class="crumbs"><a href="index.html">Home</a> / Shop</div>
    <h1 class="display">${title}</h1>
    ${description ? `<p>${esc(description)}</p>` : ""}
  </div></section>
  <section class="section"><div class="wrap">
    <div class="toolbar">
      <div class="chips">${chips.map((c) => `<a class="chip${c.key === activeKey ? " on" : ""}" href="${c.href}">${esc(c.label)}</a>`).join("")}</div>
      <div class="search">
        <form id="search" class="search"><input class="field" name="q" placeholder="Search designs" value="${esc(q)}" aria-label="Search"><button class="btn btn-sm">Search</button></form>
        <select class="select" id="sort" aria-label="Sort">
          <option value="featured">Featured</option>
          <option value="low">Price: low to high</option>
          <option value="high">Price: high to low</option>
          <option value="name">Name</option>
        </select>
      </div>
    </div>
    <p class="muted" id="count"></p>
    <div class="grid" id="grid"></div>
  </div></section>`;

function render(sort = "featured") {
  const list = [...products];
  if (sort === "low") list.sort((a, b) => a.price - b.price);
  if (sort === "high") list.sort((a, b) => b.price - a.price);
  if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  $("#count").textContent = `${list.length} design${list.length === 1 ? "" : "s"}`;
  $("#grid").innerHTML = list.length
    ? list.map(productCard).join("")
    : `<div class="empty" style="grid-column:1/-1"><h2 class="display">Nothing here yet</h2><p class="muted">Try another collection or <a class="link-arrow" href="customize.html">design your own</a>.</p></div>`;
}
render();
$("#sort").addEventListener("change", (e) => render(e.target.value));
$("#search").addEventListener("submit", (e) => {
  e.preventDefault();
  const value = new FormData(e.target).get("q").trim();
  location.href = value ? `collection.html?q=${encodeURIComponent(value)}` : "collection.html";
});
