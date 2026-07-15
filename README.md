# Schmidt Construction — Website

Static single-page marketing site for **Schmidt Construction**, a family-owned Omaha
contractor specializing in retaining walls, concrete, seawalls, and hardscaping (est. 1973).

## Contents
- `index.html` — the entire site (HTML + CSS + JS in one file)
- `images/` — hero photos, project gallery images, and logos

## Features
- Bright single-photo hero (no slideshow)
- Services, "Why Us," before/after slider, project gallery with lightbox
- **Interactive project map** (Leaflet) — 20 verified 2018 retaining-wall builds,
  shown privacy-safely by neighborhood (first name + last initial, ZIP-level location)
- Free-estimate contact form (Formspree-ready, with a mailto fallback)
- SEO meta, Open Graph/Twitter cards, and LocalBusiness structured data

## Contact
- Phone: (402) 320-2600
- Email: Mikiel@schmidt-construction.com

## Deploy
This is a static site — host it on GitHub Pages, Netlify, Vercel, or any static host.
For GitHub Pages: Settings → Pages → deploy from `main` branch, root folder.

## Privacy note
Customer data (addresses, phones, emails, project values) is **never** committed.
The map contains only anonymized, ZIP-level approximate locations. Source spreadsheets
are excluded via `.gitignore`.

## Form setup
To make the estimate form email leads: create a form at https://formspree.io pointed at
`Mikiel@schmidt-construction.com`, then paste the endpoint into the `FORM_ENDPOINT`
constant near the bottom of `index.html`. Until then it falls back to the visitor's
email client.
