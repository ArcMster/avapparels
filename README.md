# AV Apparels

A demo t-shirt store in two parts:

| Part | Folder | Hosted on | Built with |
|---|---|---|---|
| Storefront (what customers see) | `frontend/` | GitHub Pages | Plain HTML, CSS and JavaScript modules |
| API and admin (where you manage the store) | `backend/` | PythonAnywhere | Django 5.2, Django REST Framework, SQLite |

> This setup is meant for testing and demos. GitHub Pages does not allow running a real online store, so move to a VPS (for example a DigitalOcean droplet) before taking real orders. Only `frontend/js/config.js` needs to change.

## What you manage in Django admin

| Requirement | Where in admin |
|---|---|
| Dresses and their collection types | **Products** (photos, prices, colours, sizes, collections) and **Collections** |
| Offers and running messages | **Offers** (banners and coupon codes) and **Running messages** (top bar or scrolling marquee, with optional start and end dates) |
| Default arrangement and reordering | Change the **Sort order** numbers in the Collections or Products list, then click **Save**. To reorder products inside one collection, open that collection and edit the numbers in its product table. Lower numbers show first. The "Renumber sort order" action tidies the numbers to 10, 20, 30. |
| Custom t-shirt approval | **Custom design requests**. Open one to see the front and back previews, download the original artwork, set an approved price and a note, then change the status. Bulk actions: approve, request changes, reject. |
| Spotlight carousel (top of home page) | **Spotlights**. Set the pill text, title, accent line, description, ring text, accent and pill colours, auto-rotate speed and stars. Add cards (a product plus an optional moody photo) and reorder them with Sort order. Give it start and end dates for seasonal drops. The first live spotlight shows; tick **Hide main hero** to make it the top banner. |
| Everything else | **Site settings** (hero text and image, WhatsApp number, shipping fee, free shipping limit), **Custom tee styles** (fits, blank and print prices, allowed colours and sizes), **Colours**, **Sizes**, **Why-us highlights**, **Orders** |

## Colour palette

A Kerala fitness palette, defined once as CSS variables at the top of `frontend/css/styles.css`. Change them there to restyle the whole store.

| Name | Hex | Used for |
|---|---|---|
| Backwater night | `#0B1F1A` | Header, footer, dark sections, buttons |
| Kasavu cream | `#F5F0E2` | Page background |
| Kasavu zari gold | `#D6B25E` | Double border lines under the header and above the footer, offer card edge |
| Palm shoot lime | `#B8E84F` | Energy accent: announcement bar, main buttons, highlights on dark |
| Laterite orange | `#E0662A` | Second accent: sale badges, scrolling strip, links on light backgrounds |

The Django admin uses the same palette (`backend/templates/admin/base_site.html`). Spotlight colours are set per spotlight in admin.

## Spotlight carousel

A 3D card deck at the top of the home page, like a seasonal drop banner. Customers can swipe it on phones, drag it with a mouse, use a trackpad swipe, the arrow keys, the dots or the arrow buttons. It auto-rotates and pauses while someone is interacting with it. Extras: a slowly rotating text ring around the cards, twinkling stars, a glow behind the front card and a light 3D tilt that follows the mouse. Motion is turned off for visitors who ask their device for reduced motion.

For the best look, upload portrait (4:5) photos of the tee on a dark background in each card's **Image** field. Without one, the product's first photo is used.

## How the custom tee flow works

1. The customer opens **Design your tee**, picks a fit, colour, size and print placement (front, back or both), uploads artwork, and drags or resizes it on a live preview.
2. **Send for approval** uploads the original artwork plus a rendered preview. Nothing is paid yet.
3. You review it in admin. Approve it (optionally with a different price) or request changes with a note.
4. The customer's status page updates (it checks every 30 seconds). Once approved, **Add to cart** unlocks.
5. The API refuses to order any design that is not approved, and each approved design can be ordered once.

Prices are always recalculated on the server, so a customer cannot change them in the browser.

## Run it locally

```bash
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo            # demo collections, 13 products, offers, messages, tee styles
python manage.py createsuperuser
python manage.py runserver            # API on http://127.0.0.1:8000, admin at /admin/
```

In a second terminal:

```bash
cd frontend
python -m http.server 5500            # open http://localhost:5500
```

The storefront talks to `http://127.0.0.1:8000/api` automatically when opened from localhost.
Run the backend tests with `python manage.py test shop`.

`seed_demo --reset` wipes the catalogue, designs and orders and rebuilds the demo. Demo product images are drawn by the script, so replace them with real photos in admin.

## Deploy the backend to PythonAnywhere (free account works)

1. Push this repo to GitHub, then open a **Bash console** on PythonAnywhere:
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/av-apparels.git
   cd av-apparels/backend
   mkvirtualenv --python=python3.12 avenv     # or python3.11 / 3.10
   pip install -r requirements.txt
   cp .env.example .env && nano .env          # fill in the values, see below
   python manage.py migrate
   python manage.py collectstatic --noinput
   python manage.py seed_demo
   python manage.py createsuperuser
   ```
2. **Web** tab: Add a new web app, choose **Manual configuration** and the same Python version.
3. Set **Virtualenv** to `/home/YOUR_USERNAME/.virtualenvs/avenv`.
4. Open the **WSGI configuration file** link and replace its contents with `backend/pythonanywhere_wsgi.py` (change `YOUR_USERNAME`).
5. Under **Static files** add two mappings:
   | URL | Directory |
   |---|---|
   | `/static/` | `/home/YOUR_USERNAME/av-apparels/backend/staticfiles` |
   | `/media/` | `/home/YOUR_USERNAME/av-apparels/backend/media` |
6. Turn on **Force HTTPS**, click **Reload**, then open `https://YOUR_USERNAME.pythonanywhere.com/admin/`.

`.env` values for production:

```
DJANGO_SECRET_KEY=<a long random string>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=YOUR_USERNAME.pythonanywhere.com
CORS_ALLOWED_ORIGINS=https://YOUR_GITHUB_USERNAME.github.io
CSRF_TRUSTED_ORIGINS=https://YOUR_USERNAME.pythonanywhere.com
STOREFRONT_URL=https://YOUR_GITHUB_USERNAME.github.io/av-apparels
```

Generate a secret key with `python -c "import secrets; print(secrets.token_urlsafe(50))"`.

Free account notes: you get one web app on `YOUR_USERNAME.pythonanywhere.com`, limited CPU and 512 MB of disk, so keep product photos compressed (under about 300 KB each). Outgoing email over SMTP is likely blocked on the free plan, so emails print to the server log by default. Free web apps must be extended from the Web tab every few months or they get disabled.

To update after a code change: `git pull`, `python manage.py migrate`, `python manage.py collectstatic --noinput`, then **Reload** on the Web tab.

## Deploy the storefront to GitHub Pages

1. Edit `frontend/js/config.js` and replace `YOUR_USERNAME` with your PythonAnywhere username.
2. Push to the `main` branch on GitHub.
3. In the repo go to **Settings > Pages > Build and deployment** and set **Source** to **GitHub Actions**. The included workflow (`.github/workflows/pages.yml`) publishes the `frontend/` folder on every push.
4. Your store is live at `https://YOUR_GITHUB_USERNAME.github.io/av-apparels/`.

If the page says "Store is waking up", check that `CORS_ALLOWED_ORIGINS` on the server exactly matches `https://YOUR_GITHUB_USERNAME.github.io` (no trailing slash and no `/av-apparels` path), then reload the web app.

For quick testing you can point any page at another API without editing files: open `index.html?api=https://host/api` once. The value is remembered in that browser.

## API reference

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/home/` | Everything the home page needs in one call |
| GET | `/api/site/` | Header, footer and running messages |
| GET | `/api/collections/`, `/api/collections/<slug>/` | Collections in admin order, with products |
| GET | `/api/products/?tag=new\|bestseller&q=` | Product list and search |
| GET | `/api/products/<slug>/` | Product detail with related products |
| GET | `/api/customizer/` | Tee styles, colours, sizes and print prices |
| POST | `/api/custom-designs/` | Submit a design (multipart) |
| GET | `/api/custom-designs/<token>/` | Design status |
| POST | `/api/cart/quote/` | Server-side prices, coupon and shipping |
| POST | `/api/orders/` | Place an order |

Design uploads and orders are rate limited to 20 per hour per IP (`SUBMISSION_RATE` in `.env`).

## Moving to production later

- Host the backend on a VPS (Nginx, Gunicorn, PostgreSQL) and the storefront on the same domain or on Cloudflare Pages.
- Add Razorpay: create the Razorpay order in `services.create_order`, verify the payment signature on the server, and mark `payment_status` as paid from the webhook.
- Store media on Cloudflare R2 or S3 with `django-storages`.
- Server-render the product pages if search engine traffic matters.

## Project layout

```
backend/
  avapparels/          settings, urls, wsgi
  shop/
    models.py          site settings, messages, offers, spotlight, catalogue, tee styles, designs, orders
    admin.py           admin screens, reordering, approval actions, previews
    serializers.py     API shapes and upload validation
    services.py        cart pricing, order creation, email notifications
    views.py, urls.py  REST endpoints
    tests.py           API, ordering and approval tests
    management/commands/seed_demo.py
  pythonanywhere_wsgi.py, requirements.txt, .env.example
frontend/
  index.html, collection.html, product.html, customize.html, design-status.html, cart.html
  css/styles.css
  js/config.js         API address (edit before deploying)
  js/api.js, store.js, ui.js, tee.js, spotlight.js
  js/pages/*.js        one script per page
.github/workflows/pages.yml
```
