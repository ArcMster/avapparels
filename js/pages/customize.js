import { api, money } from "../api.js";
import { myDesigns } from "../store.js";
import { $, $$, esc, initLayout, toast } from "../ui.js";
import { artRect, drawTee, printRect, renderMockup } from "../tee.js";

const [, config] = await Promise.all([initLayout(null, "custom"), api.get("/customizer/")]);
const styles = config.styles;
const MAX_MB = config.max_upload_mb || 8;
const saved = JSON.parse(localStorage.getItem("av_customer") || "{}");

if (!styles.length) {
  $("#page").innerHTML = `<div class="empty wrap"><h2 class="display">Custom studio is closed</h2><p class="muted">Check back soon.</p></div>`;
  throw new Error("No tee styles configured");
}

const state = {
  style: styles[0],
  colour: styles[0].colours[0],
  size: null,
  placement: "front",
  side: "front",
  art: { front: null, back: null },
};

$("#page").innerHTML = `
  <section class="page-head"><div class="wrap">
    <div class="crumbs"><a href="index.html">Home</a> / Custom studio</div>
    <h1 class="display">Design your <em>own tee</em></h1>
    <p>Choose the fit, colour and size, upload your artwork and send it for approval. You only order once our team approves the print.</p>
  </div></section>
  <div class="wrap designer">
    <div class="stage">
      <div class="stage-tabs" id="side-tabs">
        <button class="chip on" data-side="front">Front</button>
        <button class="chip" data-side="back">Back</button>
      </div>
      <div class="tilt" id="tilt"><div class="tilt-card">
        <canvas id="canvas" width="800" height="1000" aria-label="T-shirt preview"></canvas>
        <div class="tilt-shine" aria-hidden="true"></div>
      </div></div>
      <div class="stage-tools" id="tools">
        <label for="scale">Artwork size</label>
        <input type="range" id="scale" min="20" max="100" value="80">
        <button class="btn btn-sm btn-outline" id="center">Center</button>
        <button class="btn btn-sm btn-outline" id="remove">Remove</button>
      </div>
      <p class="hint">Drag the artwork to move it. The dashed box is the printable area.</p>
    </div>

    <form id="design-form" novalidate>
      <div class="panel"><h3><b>1</b>Choose a fit</h3><div class="style-opts" id="styles"></div></div>
      <div class="panel"><h3><b>2</b>Colour <span class="muted" id="colour-label" style="text-transform:none;letter-spacing:0;font-weight:500"></span></h3><div class="swatches" id="colours"></div></div>
      <div class="panel"><h3><b>3</b>Size</h3><div class="sizes" id="sizes"></div></div>
      <div class="panel"><h3><b>4</b>Print placement</h3><div class="style-opts" id="placements"></div></div>
      <div class="panel"><h3><b>5</b>Upload artwork</h3>
        <div class="upload-row">
          ${["front", "back"].map((side) => `
          <div class="upload-slot" data-slot="${side}">
            <div class="drop" data-drop="${side}">
              <strong>${side === "front" ? "Front" : "Back"} artwork</strong>
              <p>PNG with a transparent background works best. JPG or WEBP also fine, up to ${MAX_MB} MB.</p>
              <label class="btn btn-sm btn-outline">Choose file<input type="file" accept="image/png,image/jpeg,image/webp" data-file="${side}" hidden></label>
            </div>
            <div class="name" data-name="${side}"></div>
          </div>`).join("")}
        </div>
      </div>
      <div class="panel"><h3><b>6</b>Your details</h3>
        <div class="form-grid">
          <label>Name<input class="field" name="customer_name" required maxlength="100" value="${esc(saved.customer_name || "")}"></label>
          <label>Phone<input class="field" name="customer_phone" required inputmode="tel" value="${esc(saved.customer_phone || "")}"></label>
          <label class="full">Email<input class="field" type="email" name="customer_email" required value="${esc(saved.customer_email || "")}"></label>
          <label>Quantity<input class="field" type="number" name="quantity" min="1" max="50" value="1"></label>
          <label class="full">Notes for our team<textarea class="field" name="notes" rows="3" maxlength="1000" placeholder="Print size, exact placement, colours to match..."></textarea></label>
        </div>
      </div>
      <div class="panel">
        <div id="summary"></div>
        <p class="err" id="form-error" role="alert"></p>
        <button class="btn btn-accent btn-block" id="submit" type="submit">Send for approval</button>
        <p class="muted" style="font-size:13px;margin:10px 0 0">No payment now. We review the print, confirm the final price, and you order from the approval page or your cart.</p>
      </div>
    </form>
  </div>`;

const canvas = $("#canvas");
const ctx = canvas.getContext("2d");
const needsFront = () => state.placement !== "back";
const needsBack = () => state.placement !== "front";

function draw() {
  drawTee(ctx, { hex: state.colour.hex_code, side: state.side, art: state.art[state.side] });
  const art = state.art[state.side];
  canvas.classList.toggle("can-drag", !!art);
  $("#tools").style.visibility = art ? "visible" : "hidden";
  if (art) $("#scale").value = Math.round(art.scale * 100);
}

function renderOptions() {
  $("#styles").innerHTML = styles
    .map((s) => `<button type="button" class="opt-card${s.id === state.style.id ? " on" : ""}" data-style="${s.id}"><strong>${esc(s.name)}</strong><small>${esc(s.description)}</small><br><small>Blank tee ${money(s.base_price)}</small></button>`)
    .join("");
  $("#colours").innerHTML = state.style.colours
    .map((c) => `<button type="button" class="swatch lg${c.id === state.colour.id ? " on" : ""}" style="background:${esc(c.hex_code)}" data-colour="${c.id}" title="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`)
    .join("");
  $("#colour-label").textContent = state.colour.name;
  $("#sizes").innerHTML = state.style.sizes
    .map((s) => `<button type="button" class="size-btn lg${state.size?.id === s.id ? " on" : ""}" data-size="${s.id}">${esc(s.name)}</button>`)
    .join("");
  const placements = [
    ["front", "Front", state.style.front_print_price],
    ["back", "Back", state.style.back_print_price],
    ["both", "Front and back", Number(state.style.front_print_price) + Number(state.style.back_print_price)],
  ];
  $("#placements").innerHTML = placements
    .map(([key, label, extra]) => `<button type="button" class="opt-card${state.placement === key ? " on" : ""}" data-placement="${key}"><strong>${label}</strong><small>+ ${money(extra)} print</small></button>`)
    .join("");
  $('[data-slot="front"]').style.display = needsFront() ? "" : "none";
  $('[data-slot="back"]').style.display = needsBack() ? "" : "none";
  renderSummary();
}

function unitPrice() {
  const s = state.style;
  let p = Number(s.base_price);
  if (needsFront()) p += Number(s.front_print_price);
  if (needsBack()) p += Number(s.back_print_price);
  return p;
}

function renderSummary() {
  const qty = Math.max(1, parseInt($('[name="quantity"]').value, 10) || 1);
  const s = state.style;
  $("#summary").innerHTML = `
    <div class="summary-line"><span>${esc(s.name)} tee, ${esc(state.colour.name)}${state.size ? ", " + esc(state.size.name) : ""}</span><span>${money(s.base_price)}</span></div>
    ${needsFront() ? `<div class="summary-line"><span>Front print</span><span>${money(s.front_print_price)}</span></div>` : ""}
    ${needsBack() ? `<div class="summary-line"><span>Back print</span><span>${money(s.back_print_price)}</span></div>` : ""}
    <div class="summary-line"><span>Per tee</span><span>${money(unitPrice())}</span></div>
    <div class="summary-line total"><span>Estimated total (${qty})</span><span>${money(unitPrice() * qty)}</span></div>`;
}

function setSide(side) {
  state.side = side;
  $$("#side-tabs .chip").forEach((b) => b.classList.toggle("on", b.dataset.side === side));
  draw();
}

// --- option clicks -------------------------------------------------------
$("#design-form").addEventListener("click", (e) => {
  const style = e.target.closest("[data-style]");
  const colour = e.target.closest("[data-colour]");
  const size = e.target.closest("[data-size]");
  const placement = e.target.closest("[data-placement]");
  if (style) {
    state.style = styles.find((s) => s.id === Number(style.dataset.style));
    if (!state.style.colours.some((c) => c.id === state.colour.id)) state.colour = state.style.colours[0];
    if (state.size && !state.style.sizes.some((s) => s.id === state.size.id)) state.size = null;
  } else if (colour) {
    state.colour = state.style.colours.find((c) => c.id === Number(colour.dataset.colour));
  } else if (size) {
    state.size = state.style.sizes.find((s) => s.id === Number(size.dataset.size));
  } else if (placement) {
    state.placement = placement.dataset.placement;
    if (state.placement === "back") setSide("back");
    if (state.placement === "front") setSide("front");
  } else return;
  renderOptions();
  draw();
});
$('[name="quantity"]').addEventListener("input", renderSummary);
$("#side-tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-side]");
  if (b) setSide(b.dataset.side);
});

// --- uploads ---------------------------------------------------------------
async function loadArtwork(side, file) {
  if (!file) return;
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return toast("Upload a PNG, JPG or WEBP image.", { bad: true });
  if (file.size > MAX_MB * 1024 * 1024) return toast(`Keep the file under ${MAX_MB} MB.`, { bad: true });
  const img = new Image();
  img.src = URL.createObjectURL(file);
  try {
    await img.decode();
  } catch {
    return toast("That image could not be read.", { bad: true });
  }
  const aspect = img.naturalHeight / img.naturalWidth;
  // Fit inside the print area by default.
  const pa = printRect(800, 1000);
  const scale = Math.min(0.85, (pa.h * 0.85) / (pa.w * aspect));
  state.art[side] = { file, img, scale, cx: 0.5, cy: 0.42 };
  const low = img.naturalWidth < 1200;
  $(`[data-name="${side}"]`).innerHTML = `${esc(file.name)} · ${img.naturalWidth}×${img.naturalHeight}px${low ? '<br><span class="warn">Low resolution. 2000px or wider prints sharper.</span>' : ""}`;
  if (side === "back" && state.placement === "front") state.placement = "both";
  if (side === "front" && state.placement === "back") state.placement = "both";
  renderOptions();
  setSide(side);
}

$$("[data-file]").forEach((input) => input.addEventListener("change", () => loadArtwork(input.dataset.file, input.files[0])));
$$("[data-drop]").forEach((zone) => {
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("over");
    loadArtwork(zone.dataset.drop, e.dataTransfer.files[0]);
  });
});

// --- artwork tools -----------------------------------------------------------
$("#scale").addEventListener("input", (e) => {
  const art = state.art[state.side];
  if (!art) return;
  art.scale = Number(e.target.value) / 100;
  draw();
});
$("#center").addEventListener("click", () => {
  const art = state.art[state.side];
  if (!art) return;
  art.cx = 0.5;
  art.cy = 0.42;
  draw();
});
$("#remove").addEventListener("click", () => {
  state.art[state.side] = null;
  $(`[data-name="${state.side}"]`).textContent = "";
  $(`[data-file="${state.side}"]`).value = "";
  draw();
});

// --- tilt (CSS 3D) -------------------------------------------------------------
// The card tilts toward the pointer with a moving shine. It flattens while artwork
// is being dragged so the drag maps 1:1 onto the canvas.
const tilt = $("#tilt");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
let tilting = null; // pointerId of a touch/pen tilting the tee
function setTilt(e) {
  if (reduceMotion) return;
  const r = tilt.getBoundingClientRect(); // untransformed wrapper
  const nx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  const ny = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
  tilt.style.setProperty("--ry", `${((nx - 0.5) * 24).toFixed(2)}deg`);
  tilt.style.setProperty("--rx", `${((0.5 - ny) * 16).toFixed(2)}deg`);
  tilt.style.setProperty("--sx", `${(nx * 100).toFixed(1)}%`);
  tilt.style.setProperty("--sy", `${(ny * 100).toFixed(1)}%`);
  tilt.classList.add("live");
}
function resetTilt() {
  tilt.classList.remove("live");
  ["--rx", "--ry"].forEach((v) => tilt.style.setProperty(v, "0deg"));
}
tilt.addEventListener("pointermove", (e) => {
  if (drag) return;
  if (e.pointerType === "mouse" || tilting === e.pointerId) setTilt(e);
});
tilt.addEventListener("pointerleave", (e) => {
  if (e.pointerType === "mouse" && !drag) resetTilt();
});

let drag = null;
const toCanvas = (e) => {
  // Use layout boxes (unaffected by the 3D transform) so tilt never skews the drag.
  const r = tilt.getBoundingClientRect();
  const left = r.left + canvas.offsetLeft, top = r.top + canvas.offsetTop;
  return { x: ((e.clientX - left) * canvas.width) / canvas.offsetWidth, y: ((e.clientY - top) * canvas.height) / canvas.offsetHeight };
};
function startTilt(e) {
  if (e.pointerType === "mouse") return;
  tilting = e.pointerId;
  canvas.setPointerCapture(e.pointerId);
  setTilt(e);
}
canvas.addEventListener("pointerdown", (e) => {
  const art = state.art[state.side];
  if (!art) return startTilt(e);
  const p = toCanvas(e);
  const r = artRect(art, canvas.width, canvas.height);
  const pa = printRect(canvas.width, canvas.height);
  const inside = (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) ||
    (p.x >= pa.x && p.x <= pa.x + pa.w && p.y >= pa.y && p.y <= pa.y + pa.h);
  if (!inside) return startTilt(e);
  drag = { start: p, cx: art.cx, cy: art.cy };
  resetTilt();
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add("dragging");
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const art = state.art[state.side];
  const p = toCanvas(e);
  const pa = printRect(canvas.width, canvas.height);
  art.cx = Math.min(1, Math.max(0, drag.cx + (p.x - drag.start.x) / pa.w));
  art.cy = Math.min(1, Math.max(0, drag.cy + (p.y - drag.start.y) / pa.h));
  draw();
});
const endDrag = (e) => {
  drag = null;
  canvas.classList.remove("dragging");
  if (tilting === e.pointerId) {
    tilting = null;
    resetTilt();
  }
};
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

// --- submit ---------------------------------------------------------------------
$("#design-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#form-error");
  err.textContent = "";
  const form = new FormData(e.target);
  const problems = [];
  if (!state.size) problems.push("pick a size");
  if (needsFront() && !state.art.front) problems.push("upload the front artwork");
  if (needsBack() && !state.art.back) problems.push("upload the back artwork");
  if (!form.get("customer_name").trim()) problems.push("enter your name");
  if (!/^\S+@\S+\.\S+$/.test(form.get("customer_email"))) problems.push("enter a valid email");
  if (form.get("customer_phone").replace(/\D/g, "").length < 10) problems.push("enter a valid phone number");
  if (problems.length) {
    err.textContent = `Please ${problems.join(", ")}.`;
    return;
  }

  const btn = $("#submit");
  btn.disabled = true;
  btn.textContent = "Uploading...";
  try {
    const data = new FormData();
    data.append("tee_style", state.style.id);
    data.append("colour", state.colour.id);
    data.append("size", state.size.id);
    data.append("placement", state.placement);
    data.append("quantity", Math.max(1, parseInt(form.get("quantity"), 10) || 1));
    for (const key of ["customer_name", "customer_email", "customer_phone", "notes"]) data.append(key, form.get(key).trim());
    for (const side of ["front", "back"]) {
      if ((side === "front" && !needsFront()) || (side === "back" && !needsBack())) continue;
      const art = state.art[side];
      data.append(`${side}_artwork`, art.file, art.file.name);
      const mock = await renderMockup({ hex: state.colour.hex_code, side, art });
      data.append(`${side}_mockup`, mock, `${side}-mockup.jpg`);
    }
    const design = await api.upload("/custom-designs/", data);
    localStorage.setItem("av_customer", JSON.stringify({
      customer_name: form.get("customer_name").trim(), customer_email: form.get("customer_email").trim(), customer_phone: form.get("customer_phone").trim(),
    }));
    myDesigns.add(design);
    location.href = `design-status.html?token=${design.token}&new=1`;
  } catch (error) {
    err.textContent = error.message;
    btn.disabled = false;
    btn.textContent = "Send for approval";
  }
});

renderOptions();
draw();
// Redraw once web fonts load so the placeholder label uses Inter.
document.fonts?.ready.then(draw);
