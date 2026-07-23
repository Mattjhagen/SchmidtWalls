/* ============================================================
   Schmidt Construction — Live Site Content
   ------------------------------------------------------------
   Pulls owner-editable content (phone, email, hours, about text,
   photos, service descriptions) from the Schmidt Admin database
   so changes made in the Site Editor at
   https://schmidtportals.netlify.app/admin appear here instantly
   — no code changes or redeploys needed.

   The key below is the PUBLIC anon key (read-only: row-level
   security blocks all writes for anonymous visitors).
   ============================================================ */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://hrrofmyuatuzjzrgyezo.supabase.co';
  var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhycm9mbXl1YXR1emp6cmd5ZXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NjY1ODQsImV4cCI6MjEwMDI0MjU4NH0.5qaVxVlk-ICZZTiaEpnT-A9ywYiLdGilKd3eElex3Pw';

  function fetchTable(path) {
    return fetch(SUPABASE_URL + '/rest/v1/' + path, {
      headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY }
    }).then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML.replace(/"/g, '&quot;');
  }

  /* ---------- Site info: phone, email, hours, about ---------- */

  var PHONE_RE = /\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]\d{4}/g;
  var EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

  function replaceInTextNodes(cfg) {
    if (!cfg.phone && !cfg.email) return;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode && n.parentNode.nodeName;
        return (p === 'SCRIPT' || p === 'STYLE' || p === 'NOSCRIPT')
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (t) {
      var v = t.nodeValue, nv = v;
      if (cfg.phone) nv = nv.replace(PHONE_RE, cfg.phone);
      if (cfg.email) nv = nv.replace(EMAIL_RE, cfg.email);
      if (nv !== v) t.nodeValue = nv;
    });
  }

  function applyConfig(rows) {
    if (!rows || !rows.length) return;
    var cfg = {};
    rows.forEach(function (r) { cfg[r.key] = r.value; });

    if (cfg.phone_href) {
      document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
        a.setAttribute('href', cfg.phone_href);
      });
    }
    if (cfg.email) {
      document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
        a.setAttribute('href', 'mailto:' + cfg.email);
      });
    }

    replaceInTextNodes(cfg);

    // Elements explicitly tagged with a config key, e.g. <span data-sc="hours_weekday">
    document.querySelectorAll('[data-sc]').forEach(function (el) {
      var key = el.getAttribute('data-sc');
      if (cfg[key]) el.textContent = cfg[key];
    });

    // Homepage hero slideshow overrides (hero_image_1 .. hero_image_4)
    document.querySelectorAll('.hero-slide').forEach(function (slide, i) {
      var url = cfg['hero_image_' + (i + 1)];
      if (url) slide.style.backgroundImage = "url('" + url.replace(/'/g, "%27") + "')";
    });
  }

  /* ---------- Portfolio / gallery photos ---------- */

  function applyPortfolio(items) {
    if (!items || !items.length) return;
    var sorted = items.slice().sort(function (a, b) {
      return (a.sort_order - b.sort_order) || String(a.created_at).localeCompare(String(b.created_at));
    });

    // Full gallery page: <div class="grid" data-sc-portfolio="all">
    var galleryGrid = document.querySelector('[data-sc-portfolio="all"]');
    if (galleryGrid) {
      galleryGrid.innerHTML = sorted.map(function (it) {
        return '<div class="card" style="padding:0;overflow:hidden">' +
          '<img src="' + esc(it.image_url) + '" alt="' + esc(it.title) + '" loading="lazy" style="width:100%;aspect-ratio:4/3;object-fit:cover">' +
          '<div style="padding:14px 18px"><strong>' + esc(it.title) + '</strong>' +
          (it.location ? '<div style="color:#64748b;font-size:.85rem;margin-top:2px">' + esc(it.location) + '</div>' : '') +
          '</div></div>';
      }).join('');
    }

    // Homepage grid (featured items): <div id="galleryGrid" data-sc-portfolio="featured">
    var homeGrid = document.querySelector('[data-sc-portfolio="featured"]');
    if (homeGrid) {
      var feat = sorted.filter(function (i) { return i.featured; });
      if (!feat.length) feat = sorted;
      feat = feat.slice(0, 18);
      homeGrid.innerHTML = feat.map(function (it) {
        var cap = it.title + (it.location ? ' — ' + it.location : '');
        return '<div class="gitem" data-full="' + esc(it.image_url) + '" data-cap="' + esc(cap) + '">' +
          '<img src="' + esc(it.image_url) + '" alt="' + esc(cap) + '" loading="lazy">' +
          '<div class="cap">' + esc(it.title) + '</div></div>';
      }).join('');
    }
  }

  /* ---------- Service page overrides ---------- */

  function applyServices(overrides) {
    if (!overrides || !overrides.length) return;
    var slug = document.body.getAttribute('data-sc-service');
    if (!slug) return;
    var o = null;
    overrides.forEach(function (x) { if (x.slug === slug) o = x; });
    if (!o) return;

    if (o.long_description) {
      var d = document.querySelector('[data-sc-service-desc]');
      if (d) d.textContent = o.long_description;
    }
    // Only apply real uploaded URLs (defaults in the admin are internal /assets paths)
    if (o.image_url && /^https?:\/\//.test(o.image_url)) {
      var img = document.querySelector('[data-sc-service-img]');
      if (img) img.setAttribute('src', o.image_url);
    }
  }

  /* ---------- Boot ---------- */

  function run() {
    fetchTable('site_config?select=key,value').then(applyConfig);
    fetchTable('portfolio_items?select=*&order=sort_order.asc').then(applyPortfolio);
    if (document.body.getAttribute('data-sc-service')) {
      fetchTable('service_overrides?select=*').then(applyServices);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
