/* SFRA Aromas theme scripts */
(function () {
  'use strict';

  function initTheme(root) {
    /* ---- Mobile nav ---- */
    var toggle = root.querySelector('[data-nav-toggle]');
    if (toggle) {
      toggle.addEventListener('click', function () {
        var open = document.body.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    /* ---- Hero slideshow ---- */
    function initHero(hero) {
      if (hero.sfraHero) return;
      var slides = Array.prototype.slice.call(hero.querySelectorAll('.hero__slide'));
      if (slides.length < 2) return;
      var dots = Array.prototype.slice.call(hero.querySelectorAll('[data-hero-dot]'));
      var index = 0;
      var timer = null;
      var selected = false;
      var autoplay = hero.getAttribute('data-autoplay') === 'true';
      var delay = (parseInt(hero.getAttribute('data-delay'), 10) || 6) * 1000;

      function go(n) {
        index = (n + slides.length) % slides.length;
        slides.forEach(function (s, i) { s.classList.toggle('is-active', i === index); });
        dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
      }
      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      function start() {
        stop();
        if (autoplay && !selected) timer = setInterval(function () { go(index + 1); }, delay);
      }

      var prev = hero.querySelector('[data-hero-prev]');
      var next = hero.querySelector('[data-hero-next]');
      if (prev) prev.addEventListener('click', function () { go(index - 1); start(); });
      if (next) next.addEventListener('click', function () { go(index + 1); start(); });
      dots.forEach(function (d) {
        d.addEventListener('click', function () { go(parseInt(d.getAttribute('data-hero-dot'), 10)); start(); });
      });
      hero.addEventListener('mouseenter', stop);
      hero.addEventListener('mouseleave', start);

      /* Theme editor support */
      hero.addEventListener('shopify:block:select', function (e) {
        var i = slides.findIndex(function (slide) {
          return slide === e.target || slide.contains(e.target) ||
            (e.detail && slide.getAttribute('data-block-id') === e.detail.blockId);
        });
        if (i > -1) { selected = true; stop(); go(i); }
      });
      hero.addEventListener('shopify:block:deselect', function () { selected = false; start(); });
      hero.sfraHero = { stop: stop };

      start();
    }
    root.querySelectorAll('[data-hero]').forEach(initHero);

    /* ---- Contact form: "Other" field + character counter ---- */
    root.querySelectorAll('[data-product-select]').forEach(function (select) {
      var form = select.closest('form');
      var other = form.querySelector('[data-other-field]');
      function sync() {
        var show = select.value === 'Other';
        other.hidden = !show;
        var input = other.querySelector('input');
        if (input) { input.required = show; if (!show) input.value = ''; }
      }
      select.addEventListener('change', sync);
      sync();
    });

    root.querySelectorAll('[data-counter-input]').forEach(function (area) {
      var counter = area.parentNode.querySelector('[data-counter]');
      function update() { if (counter) counter.textContent = area.value.length; }
      area.addEventListener('input', update);
      update();
    });

    /* ---- Collection sort & filters ---- */
    var filterForm = root.querySelector('[data-filter-form]');
    if (filterForm) {
      filterForm.addEventListener('change', function () { filterForm.submit(); });
    }

    /* ---- Product page: variants + gallery ---- */
    var product = root.querySelector('[data-product]');
    if (product) {
      var jsonEl = product.querySelector('[data-product-json]');
      var priceEl = product.querySelector('[data-variant-prices]');
      if (jsonEl && priceEl) {
        var data = JSON.parse(jsonEl.textContent);
        var extra = JSON.parse(priceEl.textContent);
        var selects = product.querySelectorAll('[data-option-index]');
        var idInput = product.querySelector('[data-variant-id]');
        var priceOut = product.querySelector('[data-price]');
        var addBtn = product.querySelector('[data-add-btn]');

        var showMedia = function (id) {
          if (!id) return;
          var found = false;
          product.querySelectorAll('.product__slide').forEach(function (s) {
            var match = s.getAttribute('data-media-id') === String(id);
            if (match) found = true;
          });
          if (!found) return;
          product.querySelectorAll('.product__slide').forEach(function (s) {
            s.classList.toggle('is-active', s.getAttribute('data-media-id') === String(id));
          });
          product.querySelectorAll('[data-thumb]').forEach(function (t) {
            t.classList.toggle('is-active', t.getAttribute('data-thumb') === String(id));
          });
        };

        var update = function () {
          var chosen = [];
          selects.forEach(function (s) { chosen[parseInt(s.getAttribute('data-option-index'), 10)] = s.value; });
          var variant = null;
          data.variants.forEach(function (v) {
            var ok = chosen.every(function (val, i) { return v.options[i] === val; });
            if (ok) variant = v;
          });
          if (!variant) {
            addBtn.disabled = true;
            addBtn.textContent = 'Unavailable';
            return;
          }
          var info = extra[String(variant.id)];
          idInput.value = variant.id;
          if (info) {
            priceOut.innerHTML = (info.compare ? '<s>' + info.compare + '</s> ' : '') + '<span>' + info.price + '</span>';
            addBtn.disabled = !info.available;
            addBtn.textContent = info.available ? 'Add to cart' : 'Sold out';
            showMedia(info.media);
          }
          var url = new URL(window.location.href);
          url.searchParams.set('variant', variant.id);
          window.history.replaceState({}, '', url.toString());
        };
        selects.forEach(function (s) { s.addEventListener('change', update); });
      }

      product.querySelectorAll('[data-thumb]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-thumb');
          product.querySelectorAll('.product__slide').forEach(function (s) {
            s.classList.toggle('is-active', s.getAttribute('data-media-id') === id);
          });
          product.querySelectorAll('[data-thumb]').forEach(function (t) { t.classList.toggle('is-active', t === btn); });
        });
      });
    }
  }
  initTheme(document);
  document.addEventListener('shopify:section:load', function (event) {
    initTheme(event.target);
  });
  document.addEventListener('shopify:section:unload', function (event) {
    event.target.querySelectorAll('[data-hero]').forEach(function (hero) {
      if (hero.sfraHero) hero.sfraHero.stop();
    });
    if (event.target.querySelector('[data-header]')) document.body.classList.remove('nav-open');
  });
})();
