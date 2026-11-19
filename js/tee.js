// Flat-lay t-shirt renderer for the custom design preview.
// The outline matches the one used by the backend's seed_demo images.
export const OUTLINE = [
  [0.30, 0.145], [0.42, 0.12], [0.445, 0.155], [0.5, 0.17], [0.555, 0.155], [0.58, 0.12],
  [0.70, 0.145], [0.88, 0.24], [0.96, 0.42], [0.83, 0.47], [0.80, 0.36], [0.80, 0.84],
  [0.20, 0.84], [0.20, 0.36], [0.17, 0.47], [0.04, 0.42], [0.12, 0.24],
];
const NECK = [[0.42, 0.12], [0.445, 0.155], [0.5, 0.17], [0.555, 0.155], [0.58, 0.12]];

// Printable zone, as fractions of the canvas.
export const PRINT_AREA = { x: 0.32, y: 0.23, w: 0.36, h: 0.45 };

function hexToRgb(hex) {
  const v = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
}
function isDark(hex) {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

function tracePath(ctx, W, H) {
  ctx.beginPath();
  OUTLINE.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)));
  ctx.closePath();
}

export function printRect(W, H) {
  return { x: PRINT_AREA.x * W, y: PRINT_AREA.y * H, w: PRINT_AREA.w * W, h: PRINT_AREA.h * H };
}

/** Where the artwork sits, in canvas pixels. art = {img, scale, cx, cy}. */
export function artRect(art, W, H) {
  const pa = printRect(W, H);
  const w = pa.w * art.scale;
  const h = w * (art.img.naturalHeight / art.img.naturalWidth);
  return { x: pa.x + art.cx * pa.w - w / 2, y: pa.y + art.cy * pa.h - h / 2, w, h };
}

export function drawTee(ctx, { hex = "#141414", side = "front", art = null, guide = true, background = "#efe8d6" } = {}) {
  const { width: W, height: H } = ctx.canvas;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);

  // Shadow
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.22)";
  ctx.shadowBlur = W * 0.04;
  ctx.shadowOffsetY = H * 0.015;
  tracePath(ctx, W, H);
  ctx.fillStyle = hex;
  ctx.fill();
  ctx.restore();

  // Fabric shading
  ctx.save();
  tracePath(ctx, W, H);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, "rgba(0,0,0,.10)");
  g.addColorStop(0.3, "rgba(255,255,255,.04)");
  g.addColorStop(0.7, "rgba(255,255,255,.03)");
  g.addColorStop(1, "rgba(0,0,0,.12)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const v = ctx.createLinearGradient(0, H * 0.12, 0, H * 0.85);
  v.addColorStop(0, "rgba(255,255,255,.06)");
  v.addColorStop(1, "rgba(0,0,0,.08)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  // Artwork, clipped to the printable zone
  if (art?.img) {
    const pa = printRect(W, H);
    const r = artRect(art, W, H);
    ctx.save();
    ctx.beginPath();
    ctx.rect(pa.x, pa.y, pa.w, pa.h);
    ctx.clip();
    ctx.globalAlpha = 0.97;
    ctx.drawImage(art.img, r.x, r.y, r.w, r.h);
    ctx.restore();
  }
  ctx.restore();

  // Seams and collar
  const dark = isDark(hex);
  const seam = dark ? "rgba(255,255,255,.14)" : "rgba(0,0,0,.14)";
  ctx.strokeStyle = seam;
  ctx.lineWidth = W * 0.003;
  const line = (a, b) => {
    ctx.beginPath();
    ctx.moveTo(a[0] * W, a[1] * H);
    ctx.lineTo(b[0] * W, b[1] * H);
    ctx.stroke();
  };
  line([0.20, 0.36], [0.28, 0.16]);
  line([0.80, 0.36], [0.72, 0.16]);
  line([0.20, 0.81], [0.80, 0.81]);
  line([0.155, 0.44], [0.065, 0.405]);
  line([0.845, 0.44], [0.935, 0.405]);

  ctx.strokeStyle = dark ? "rgba(255,255,255,.22)" : "rgba(0,0,0,.25)";
  ctx.lineWidth = W * 0.012;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  NECK.forEach(([x, y], i) => {
    const yy = side === "back" && x > 0.43 && x < 0.57 ? y - 0.03 : y;
    i ? ctx.lineTo(x * W, yy * H) : ctx.moveTo(x * W, yy * H);
  });
  ctx.stroke();

  if (guide) {
    const pa = printRect(W, H);
    ctx.save();
    ctx.setLineDash([W * 0.012, W * 0.01]);
    ctx.strokeStyle = dark ? "rgba(255,255,255,.55)" : "rgba(0,0,0,.4)";
    ctx.lineWidth = W * 0.0025;
    ctx.strokeRect(pa.x, pa.y, pa.w, pa.h);
    ctx.restore();
    if (!art?.img) {
      ctx.fillStyle = dark ? "rgba(255,255,255,.6)" : "rgba(0,0,0,.45)";
      ctx.font = `600 ${Math.round(W * 0.024)}px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`${side.toUpperCase()} PRINT AREA`, pa.x + pa.w / 2, pa.y + pa.h / 2);
    }
  }
}

/** Render a clean mockup (no guide) and return it as a JPEG Blob. */
export function renderMockup(options, width = 800, height = 1000) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  drawTee(canvas.getContext("2d"), { ...options, guide: false });
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
}
