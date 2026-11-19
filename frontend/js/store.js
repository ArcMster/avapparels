// Cart and saved custom designs, kept in localStorage.
const CART_KEY = "av_cart_v1";
const DESIGNS_KEY = "av_designs_v1";

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("av:storage", { detail: key }));
}

export const cart = {
  items: () => read(CART_KEY),
  count: () => read(CART_KEY).reduce((n, i) => n + (i.quantity || 1), 0),
  save: (items) => write(CART_KEY, items),
  clear: () => write(CART_KEY, []),

  addProduct(product, colour, size, quantity = 1, image = null) {
    const items = read(CART_KEY);
    const key = `p:${product.slug}:${colour}:${size}`;
    const existing = items.find((i) => i.key === key);
    if (existing) existing.quantity = Math.min(20, existing.quantity + quantity);
    else
      items.push({
        key, type: "product", slug: product.slug, colour, size, quantity,
        name: product.name, price: product.price, image: image || product.colour_images?.[colour] || product.image,
      });
    write(CART_KEY, items);
  },

  addCustom(design) {
    const items = read(CART_KEY);
    const key = `c:${design.token}`;
    if (!items.find((i) => i.key === key)) {
      items.push({
        key, type: "custom", token: design.token, quantity: design.quantity,
        name: `Custom ${design.tee_style} tee`, colour: design.colour.name, size: design.size,
        price: design.unit_price, image: design.front_mockup || design.back_mockup,
      });
      write(CART_KEY, items);
    }
  },

  update(key, quantity) {
    const items = read(CART_KEY).map((i) => (i.key === key ? { ...i, quantity } : i));
    write(CART_KEY, items);
  },
  remove(key) {
    write(CART_KEY, read(CART_KEY).filter((i) => i.key !== key));
  },
  // Shape expected by the API.
  payload: () =>
    read(CART_KEY).map((i) =>
      i.type === "custom" ? { type: "custom", token: i.token } : { type: "product", slug: i.slug, colour: i.colour, size: i.size, quantity: i.quantity }
    ),
};

export const myDesigns = {
  all: () => read(DESIGNS_KEY),
  add(design) {
    const list = read(DESIGNS_KEY).filter((d) => d.token !== design.token);
    list.unshift({ token: design.token, reference: design.reference, created_at: design.created_at });
    write(DESIGNS_KEY, list.slice(0, 20));
  },
  remove(token) {
    write(DESIGNS_KEY, read(DESIGNS_KEY).filter((d) => d.token !== token));
  },
};
