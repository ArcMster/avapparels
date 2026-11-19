import { api, money } from "../api.js";
import { cart, myDesigns } from "../store.js";
import { $, esc, initLayout, params, toast, whatsappLink } from "../ui.js";

await initLayout(null);
const token = params.get("token");
const isNew = params.get("new") === "1";

const STEPS = [
  ["submitted", "Design submitted"],
  ["review", "Reviewed by our team"],
  ["approved", "Approved, ready to order"],
  ["ordered", "Ordered"],
];

function stepsDone(status) {
  if (status === "pending") return 1;
  if (status === "changes_requested" || status === "rejected") return 2;
  if (status === "approved") return 3;
  if (status === "ordered") return 4;
  return 1;
}

function statusMessage(d) {
  switch (d.status) {
    case "pending":
      return `<div class="notice info">We are reviewing your design. This usually takes a few hours during working days. This page updates on its own.</div>`;
    case "approved":
      return `<div class="notice ok"><strong>Approved.</strong> Your tee is ready to order at ${money(d.unit_price)} per piece.</div>`;
    case "changes_requested":
      return `<div class="notice info"><strong>Changes needed.</strong> Please read the note below and send an updated design.</div>`;
    case "rejected":
      return `<div class="notice bad"><strong>Not approved.</strong> We cannot print this design. See the note below.</div>`;
    case "ordered":
      return `<div class="notice ok">This design has been ordered. Thank you.</div>`;
    default:
      return "";
  }
}

async function renderDetail() {
  let d;
  try {
    d = await api.get(`/custom-designs/${encodeURIComponent(token)}/`);
  } catch (err) {
    return `<div class="notice bad">${esc(err.status === 404 ? "We could not find this design." : err.message)}</div>`;
  }
  myDesigns.add(d);
  const done = stepsDone(d.status);
  const inCart = cart.items().some((i) => i.token === d.token);
  const wa = whatsappLink(`Hi, I have a question about my custom design ${d.reference}.`);
  const html = `
    <div class="status-grid">
      <div class="mockups">
        ${d.front_mockup ? `<figure><img src="${esc(d.front_mockup)}" alt="Front preview"><figcaption>Front</figcaption></figure>` : ""}
        ${d.back_mockup ? `<figure><img src="${esc(d.back_mockup)}" alt="Back preview"><figcaption>Back</figcaption></figure>` : ""}
      </div>
      <div>
        ${isNew ? `<div class="notice ok" style="margin-bottom:14px"><strong>Sent for approval.</strong> We emailed you a link to this page. Bookmark it to check back.</div>` : ""}
        <span class="status-badge st-${esc(d.status)}">${esc(d.status_label)}</span>
        <h2 class="display" style="font-size:44px;margin:14px 0 6px">Design ${esc(d.reference)}</h2>
        <p class="muted mt-0">${esc(d.tee_style)} tee · ${esc(d.colour.name)} · Size ${esc(d.size)} · ${esc(d.placement_label)} print · Qty ${d.quantity}</p>
        ${statusMessage(d)}
        ${d.admin_note ? `<div class="notice" style="margin-top:12px"><strong>Note from our team</strong><br>${esc(d.admin_note).replace(/\n/g, "<br>")}</div>` : ""}
        <ul class="timeline">${STEPS.map(([, label], i) => `<li class="${i < done ? "done" : ""}">${label}</li>`).join("")}</ul>
        <div class="summary-line"><span>${d.status === "approved" || d.status === "ordered" ? "Confirmed price" : "Estimated price"} per tee</span><strong>${money(d.unit_price)}</strong></div>
        <div class="summary-line total"><span>Total for ${d.quantity}</span><span>${money(d.unit_price * d.quantity)}</span></div>
        <div class="buy-row" style="margin-top:18px">
          ${d.can_order ? `<button class="btn" id="add-custom" ${inCart ? "disabled" : ""}>${inCart ? "In your cart" : "Add to cart"}</button><a class="btn btn-accent" href="cart.html" id="checkout-custom">Checkout</a>` : ""}
          ${d.status === "changes_requested" || d.status === "rejected" ? `<a class="btn" href="customize.html">Send a new design</a>` : ""}
          ${wa ? `<a class="btn btn-outline" href="${esc(wa)}" target="_blank" rel="noopener">Ask on WhatsApp</a>` : ""}
        </div>
      </div>
    </div>`;
  return { html, design: d };
}

async function renderList() {
  const list = myDesigns.all().filter((x) => x.token !== token);
  if (!list.length) return "";
  const results = await Promise.all(list.map((x) => api.get(`/custom-designs/${encodeURIComponent(x.token)}/`).catch((e) => (e.status === 404 ? "gone" : null))));
  const rows = results
    .map((d, i) => {
      if (d === "gone") {
        myDesigns.remove(list[i].token);
        return "";
      }
      if (!d) return "";
      return `<a class="my-design" href="design-status.html?token=${encodeURIComponent(d.token)}">
        <img src="${esc(d.front_mockup || d.back_mockup || "")}" alt="">
        <div class="grow"><strong>${esc(d.reference)}</strong><div class="muted" style="font-size:13px">${esc(d.tee_style)} · ${esc(d.colour.name)} · ${esc(d.size)} · Qty ${d.quantity}</div></div>
        <span class="status-badge st-${esc(d.status)}">${esc(d.status_label)}</span></a>`;
    })
    .join("");
  return rows ? `<section class="section" style="padding-top:${token ? "0" : "40px"}"><h2 class="display" style="font-size:36px">${token ? "Your other designs" : "Your designs"}</h2><div class="my-designs" style="margin-top:16px">${rows}</div></section>` : "";
}

async function render() {
  const detail = token ? await renderDetail() : null;
  const list = await renderList();
  $("#page").innerHTML = `
    <section class="page-head"><div class="wrap">
      <div class="crumbs"><a href="index.html">Home</a> / <a href="customize.html">Custom studio</a> / Approval</div>
      <h1 class="display">Design <em>approval</em></h1>
      <p>Track the designs you sent from this browser. Approved designs can be added to your cart.</p>
    </div></section>
    <div class="wrap">
      ${detail ? (typeof detail === "string" ? `<div style="padding:40px 0">${detail}</div>` : detail.html) : ""}
      ${list}
      ${!detail && !list ? `<div class="empty"><h2 class="display">No designs yet</h2><p class="muted">Designs you send for approval show up here.</p><a class="btn btn-accent" href="customize.html">Design a tee</a></div>` : ""}
    </div>`;

  const design = detail?.design;
  $("#add-custom")?.addEventListener("click", (e) => {
    cart.addCustom(design);
    e.target.disabled = true;
    e.target.textContent = "In your cart";
    toast("Custom tee added to cart", { link: "cart.html", linkText: "View cart" });
  });
  $("#checkout-custom")?.addEventListener("click", () => cart.addCustom(design));
  return design;
}

const design = await render();
// Keep polling while the team reviews it.
if (design && design.status === "pending") {
  const timer = setInterval(async () => {
    const d = await api.get(`/custom-designs/${encodeURIComponent(token)}/`).catch(() => null);
    if (d && d.status !== "pending") {
      clearInterval(timer);
      render();
      toast(`Design ${d.reference}: ${d.status_label}`);
    }
  }, 30000);
}
