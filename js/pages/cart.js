import { api, money } from "../api.js";
import { cart } from "../store.js";
import { $, $$, esc, initLayout, toast } from "../ui.js";

const layout = await initLayout(null);
const saved = JSON.parse(localStorage.getItem("av_customer") || "{}");
let coupon = localStorage.getItem("av_coupon") || "";
let quote = null;
let lineErrors = {};
let placing = false;

const STATES = ["Andhra Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];

function shell() {
  $("#page").innerHTML = `
    <section class="page-head"><div class="wrap"><div class="crumbs"><a href="index.html">Home</a> / Cart</div><h1 class="display">Your <em>cart</em></h1></div></section>
    <div class="wrap" id="cart-root"></div>`;
}

async function refreshQuote() {
  lineErrors = {};
  quote = null;
  const items = cart.items();
  if (!items.length) return;
  try {
    quote = await api.post("/cart/quote/", { items: cart.payload(), coupon_code: coupon });
    if (coupon && !quote.coupon_code) {
      toast(quote.coupon_message || "Coupon not valid.", { bad: true });
      coupon = "";
      localStorage.removeItem("av_coupon");
    }
  } catch (err) {
    const list = err.data?.items;
    if (Array.isArray(list) && list.some((x) => x && x.index !== undefined)) {
      list.forEach((x) => (lineErrors[Number(x.index)] = x.error));
    } else {
      toast(err.message, { bad: true });
    }
  }
}

function lineHtml(item, i) {
  const unit = quote?.lines.find((l) => (item.type === "custom" ? l.token === item.token : l.slug === item.slug && l.colour === item.colour && l.size === item.size));
  const price = unit ? unit.unit_price : item.price;
  const link = item.type === "custom" ? `design-status.html?token=${encodeURIComponent(item.token)}` : `product.html?slug=${encodeURIComponent(item.slug)}`;
  return `<div class="cart-line" data-key="${esc(item.key)}">
    <a href="${link}"><img src="${esc(item.image || "")}" alt=""></a>
    <div>
      <a href="${link}"><strong>${esc(item.name)}</strong></a>
      <div class="meta">${[item.colour, item.size && `Size ${item.size}`].filter(Boolean).map(esc).join(" · ")}${item.type === "custom" ? " · Approved custom design" : ""}</div>
      <div class="price-row" style="margin-top:6px"><span class="price">${money(price)}</span></div>
      ${lineErrors[i] ? `<div class="line-err">${esc(lineErrors[i])}</div>` : ""}
    </div>
    <div style="display:grid;gap:8px;justify-items:end">
      ${item.type === "custom" ? `<span class="muted" style="font-size:13px">Qty ${item.quantity}</span>` : `<div class="qty"><button data-dq="-1" aria-label="Less">−</button><input value="${item.quantity}" readonly aria-label="Quantity"><button data-dq="1" aria-label="More">+</button></div>`}
      <button class="remove" data-remove>Remove</button>
    </div>
  </div>`;
}

function render() {
  const items = cart.items();
  const root = $("#cart-root");
  if (!items.length) {
    root.innerHTML = `<div class="empty"><h2 class="display">Your cart is empty</h2><p class="muted">Find something heavy to wear, or design your own.</p>
      <div class="buy-row" style="justify-content:center"><a class="btn" href="collection.html">Shop tees</a><a class="btn btn-outline" href="customize.html">Design your own</a></div></div>`;
    return;
  }
  const hasErrors = Object.keys(lineErrors).length > 0;
  const free = Number(layout.site.free_shipping_threshold);
  const sub = quote ? Number(quote.subtotal) - Number(quote.discount) : 0;
  root.innerHTML = `
    <div class="cart-grid">
      <div>
        <div id="lines">${items.map(lineHtml).join("")}</div>
        ${quote && free > 0 && sub < free ? `<div class="notice info">Add ${money(free - sub)} more for free shipping.</div>` : ""}
      </div>
      <div class="sticky">
        <div class="panel">
          <h3>Order summary</h3>
          <form class="coupon" id="coupon-form"><input class="field" name="code" placeholder="Coupon code" value="${esc(coupon)}" aria-label="Coupon code"><button class="btn btn-sm btn-outline">${coupon ? "Update" : "Apply"}</button></form>
          ${quote?.coupon_code ? `<p class="muted" style="font-size:13px;margin:0 0 8px">${esc(quote.coupon_message)} <button class="remove" id="remove-coupon">Remove</button></p>` : ""}
          ${quote ? `
            <div class="summary-line"><span>Subtotal</span><span>${money(quote.subtotal)}</span></div>
            ${Number(quote.discount) > 0 ? `<div class="summary-line"><span>Discount</span><span>− ${money(quote.discount)}</span></div>` : ""}
            <div class="summary-line"><span>Shipping</span><span>${Number(quote.shipping) ? money(quote.shipping) : "Free"}</span></div>
            <div class="summary-line total"><span>Total</span><span>${money(quote.total)}</span></div>` : hasErrors ? `<p class="err">Fix the items marked in red to continue.</p>` : `<p class="muted">Calculating...</p>`}
        </div>
        <form class="panel" id="checkout" novalidate>
          <h3>Delivery details</h3>
          <div class="form-grid">
            <label>Full name<input class="field" name="customer_name" required value="${esc(saved.customer_name || "")}"></label>
            <label>Phone<input class="field" name="customer_phone" required inputmode="tel" value="${esc(saved.customer_phone || "")}"></label>
            <label class="full">Email<input class="field" type="email" name="customer_email" required value="${esc(saved.customer_email || "")}"></label>
            <label class="full">Address<input class="field" name="address_line1" required value="${esc(saved.address_line1 || "")}"></label>
            <label class="full">Apartment, landmark (optional)<input class="field" name="address_line2" value="${esc(saved.address_line2 || "")}"></label>
            <label>City<input class="field" name="city" required value="${esc(saved.city || "")}"></label>
            <label>PIN code<input class="field" name="pincode" required inputmode="numeric" maxlength="6" value="${esc(saved.pincode || "")}"></label>
            <label class="full">State<select class="field" name="state" required>
              <option value="">Select state</option>${STATES.map((s) => `<option${(saved.state || "Kerala") === s ? " selected" : ""}>${s}</option>`).join("")}
            </select></label>
            <label class="full">Payment
              <select class="field" name="payment_method">
                <option value="cod">Cash on delivery</option>
                <option value="upi_on_call">UPI link after we confirm the order</option>
              </select></label>
            <label class="full">Order notes (optional)<textarea class="field" name="notes" rows="2" maxlength="500"></textarea></label>
          </div>
          <p class="err" id="checkout-error" role="alert"></p>
          <button class="btn btn-accent btn-block" id="place" ${quote && !hasErrors ? "" : "disabled"}>Place order${quote ? ` · ${money(quote.total)}` : ""}</button>
          <p class="muted" style="font-size:12px;margin:10px 0 0">Demo store: no online payment is taken. We confirm every order by phone or WhatsApp.</p>
        </form>
      </div>
    </div>`;
}

async function update() {
  await refreshQuote();
  render();
}

function success(order) {
  $("#page").innerHTML = `
    <section class="page-head"><div class="wrap"><h1 class="display">Thank <em>you</em></h1><p>Your order is placed. We will confirm it on your phone shortly.</p></div></section>
    <div class="wrap" style="max-width:640px;padding:40px 0 64px">
      <div class="panel">
        <span class="eyebrow">Order number</span>
        <h2 class="display" style="font-size:44px;margin:8px 0 16px">${esc(order.number)}</h2>
        ${order.items.map((i) => `<div class="summary-line"><span>${i.quantity} × ${esc(i.name)} ${[i.colour, i.size].filter(Boolean).map(esc).join(" / ")}</span><span>${money(i.line_total)}</span></div>`).join("")}
        ${Number(order.discount) ? `<div class="summary-line"><span>Discount</span><span>− ${money(order.discount)}</span></div>` : ""}
        <div class="summary-line"><span>Shipping</span><span>${Number(order.shipping) ? money(order.shipping) : "Free"}</span></div>
        <div class="summary-line total"><span>Total</span><span>${money(order.total)}</span></div>
      </div>
      <div class="buy-row"><a class="btn" href="collection.html">Keep shopping</a><a class="btn btn-outline" href="design-status.html">My designs</a></div>
    </div>`;
  window.scrollTo(0, 0);
}

// --- events -----------------------------------------------------------------
document.addEventListener("click", async (e) => {
  const line = e.target.closest(".cart-line");
  if (line && e.target.closest("[data-remove]")) {
    cart.remove(line.dataset.key);
    return update();
  }
  const dq = e.target.closest("[data-dq]");
  if (line && dq) {
    const item = cart.items().find((i) => i.key === line.dataset.key);
    const q = Math.min(20, Math.max(1, item.quantity + Number(dq.dataset.dq)));
    if (q !== item.quantity) {
      cart.update(item.key, q);
      return update();
    }
  }
  if (e.target.id === "remove-coupon") {
    coupon = "";
    localStorage.removeItem("av_coupon");
    return update();
  }
});

document.addEventListener("submit", async (e) => {
  if (e.target.id === "coupon-form") {
    e.preventDefault();
    coupon = new FormData(e.target).get("code").trim().toUpperCase();
    if (coupon) localStorage.setItem("av_coupon", coupon);
    await update();
    if (quote?.coupon_code) toast(quote.coupon_message);
    return;
  }
  if (e.target.id !== "checkout") return;
  e.preventDefault();
  if (placing) return;
  const form = new FormData(e.target);
  const data = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v).trim()]));
  const err = $("#checkout-error");
  const missing = ["customer_name", "customer_phone", "customer_email", "address_line1", "city", "pincode", "state"].filter((k) => !data[k]);
  if (missing.length) {
    err.textContent = "Please fill in all required delivery details.";
    $$(`#checkout [name="${missing[0]}"]`)[0]?.focus();
    return;
  }
  if (!/^\d{6}$/.test(data.pincode)) {
    err.textContent = "Enter a 6 digit PIN code.";
    return;
  }
  placing = true;
  const btn = $("#place");
  btn.disabled = true;
  btn.textContent = "Placing order...";
  try {
    const order = await api.post("/orders/", { ...data, items: cart.payload(), coupon_code: coupon });
    const keep = { ...data };
    delete keep.notes;
    delete keep.payment_method;
    localStorage.setItem("av_customer", JSON.stringify(keep));
    localStorage.removeItem("av_coupon");
    cart.clear();
    success(order);
  } catch (error) {
    err.textContent = error.message;
    placing = false;
    await refreshQuote();
    btn.disabled = !quote;
    btn.textContent = `Place order${quote ? ` · ${money(quote.total)}` : ""}`;
  }
});

shell();
render();
update();
