# Schmidt Walls — Deploy Checklist

Complete guide from local repo to live site at **www.schmidtwalls.com**.

## 1. Create the GitHub repo (if it doesn't exist)
Go to https://github.com/new → name it **`SchmidtWalls`** → **empty** (no README, no .gitignore) → Create.

## 2. Push the site
In a terminal at `C:\Users\mattj\Desktop\SchmidtNewHomepage`:
```bash
git remote set-url origin git@github.com:Mattjhagen/SchmidtWalls.git
git add -A
git commit -m "Schmidt Walls site: hero, phone, gallery, SEO, form, project map + deploy config"
git push -u origin main
```
- If **"Permission denied (publickey)"** → use HTTPS instead:
  ```bash
  git remote set-url origin https://github.com/Mattjhagen/SchmidtWalls.git
  git push -u origin main
  ```
- If the push is **rejected** (remote already has commits):
  ```bash
  git pull --rebase origin main
  git push -u origin main
  ```

## 3. Enable GitHub Pages
Repo → **Settings → Pages → Source: GitHub Actions**.
The included `.github/workflows/deploy.yml` deploys automatically. Every future push to `main` redeploys on its own.

## 4. Point DNS at GitHub (at your domain registrar)
**Primary — `www` (CNAME record):**
```
Type: CNAME   Host: www   Value: mattjhagen.github.io
```
**Apex redirect — `schmidtwalls.com` (four A records):**
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

## 5. Attach the custom domain
Repo → **Settings → Pages → Custom domain** → enter **`www.schmidtwalls.com`** → Save.
Wait for DNS to propagate (usually < 1 hr), then check **Enforce HTTPS**.

## 6. Verify it's live
- Visit https://www.schmidtwalls.com → homepage loads
- Hero photo is bright (no slideshow); phone reads **(402) 320-2600**
- Gallery lightbox opens; project map shows 20 markers
- https://www.schmidtwalls.com/sitemap.xml and /robots.txt resolve

## 7. Turn on the estimate form (optional, ~2 min)
Create a form at https://formspree.io pointed at `Mikiel@schmidt-construction.com`,
then paste the endpoint into the `FORM_ENDPOINT = ""` line near the bottom of `index.html`.
Commit & push. Until then, the form falls back to the visitor's email client.

---

## Repo contents
`index.html`, `images/`, `README.md`, `.gitignore`, `robots.txt`, `sitemap.xml`,
`CNAME`, `.github/workflows/deploy.yml`.
Customer spreadsheets and editor snapshots are excluded via `.gitignore`.

## Privacy note
The project map contains only anonymized, ZIP-level approximate locations
(first name + last initial). No addresses, phones, emails, or project values
are ever committed.
