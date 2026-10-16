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

    /* Nested navigation keeps parent links independently clickable. */
    var header = root.querySelector('[data-header]');
    if (header && !header.sfraNavigation) {
      var controller = new AbortController();
      var options = { signal: controller.signal };
      var search = header.querySelector('[data-search-modal]');
      var searchTrigger = header.querySelector('[data-search-open]');
      if (search && searchTrigger && typeof search.showModal === 'function') {
        // The top-layer dialog stays independent of sticky-header stacking and clipping.
        document.body.appendChild(search);
        var input = search.querySelector('[data-search-input]');
        var products = search.querySelector('[data-search-products]');
        var label = search.querySelector('[data-search-label]');
        var status = search.querySelector('[data-search-status]');
        var allLink = search.querySelector('[data-search-all]');
        var initialProducts = products.innerHTML;
        var catalogUrl = allLink.href;
        var searchUrl = search.getAttribute('data-search-url');
        var timer;
        var request;
        var sequence = 0;
        function cancelRequest() {
          clearTimeout(timer);
          if (request) request.abort();
          sequence += 1;
          products.removeAttribute('aria-busy');
        }
        function resetResults() {
          products.innerHTML = initialProducts;
          label.textContent = 'Explore products';
          allLink.href = catalogUrl;
          allLink.firstChild.textContent = 'View all products ';
          status.textContent = '';
        }
        function closeSearch() { if (search.open) search.close(); }
        searchTrigger.addEventListener('click', function (event) {
          event.preventDefault();
          closeSubmenus();
          document.body.classList.remove('nav-open');
          if (toggle) toggle.setAttribute('aria-expanded', 'false');
          search.showModal();
          document.body.classList.add('search-modal-open');
          input.focus();
          if (input.value.trim()) input.dispatchEvent(new Event('input'));
        }, options);
        search.querySelector('[data-search-close]').addEventListener('click', closeSearch, options);
        search.addEventListener('click', function (event) { if (event.target === search) closeSearch(); }, options);
        search.addEventListener('close', function () {
          cancelRequest();
          document.body.classList.remove('search-modal-open');
          searchTrigger.focus();
        }, options);
        search.querySelector('form').addEventListener('submit', function (event) {
          input.value = input.value.trim();
          if (!input.value) { event.preventDefault(); input.focus(); }
        }, options);
        input.addEventListener('input', function () {
          cancelRequest();
          var query = input.value.trim();
          if (!query) { resetResults(); return; }
          var current = sequence;
          var resultUrl = new URL(searchUrl, window.location.origin);
          resultUrl.searchParams.set('q', query);
          resultUrl.searchParams.set('type', 'product');
          resultUrl.searchParams.set('options[prefix]', 'last');
          allLink.href = resultUrl.toString();
          allLink.firstChild.textContent = 'View all results ';
          label.textContent = 'Searching?';
          status.textContent = 'Searching products';
          products.replaceChildren();
          products.setAttribute('aria-busy', 'true');
          timer = setTimeout(async function () {
            request = new AbortController();
            try {
              var url = new URL(searchUrl + '/suggest.json', window.location.origin);
              url.searchParams.set('q', query);
              url.searchParams.set('resources[type]', 'product');
              url.searchParams.set('resources[limit]', '10');
              var response = await fetch(url.toString(), { signal: request.signal, headers: { Accept: 'application/json' } });
              if (!response.ok) throw new Error('Search unavailable');
              var data = await response.json();
              if (current !== sequence || !search.open) return;
              var matches = data.resources.results.products || [];
              products.replaceChildren();
              matches.forEach(function (product) {
                var li = document.createElement('li');
                var link = document.createElement('a');
                link.className = 'search-modal__product';
                link.href = product.url;
                var thumbnail = document.createElement('span');
                thumbnail.className = 'search-modal__thumbnail';
                var imageUrl = product.image || (product.featured_image && product.featured_image.url);
                if (imageUrl && typeof imageUrl === 'string') {
                  var image = document.createElement('img');
                  image.src = imageUrl; image.alt = ''; image.loading = 'lazy'; image.width = 48; image.height = 48;
                  thumbnail.appendChild(image);
                } else thumbnail.appendChild(search.querySelector('.search-modal__icon .icon').cloneNode(true));
                var name = document.createElement('span');
                name.className = 'search-modal__name'; name.textContent = product.title;
                var type = document.createElement('span');
                type.className = 'search-modal__type'; type.textContent = product.type || product.product_type || '';
                link.append(thumbnail, name, type); li.appendChild(link); products.appendChild(li);
              });
              label.textContent = matches.length ? 'Products' : 'No matching products';
              status.textContent = matches.length + ' products suggested';
              if (!matches.length) {
                var empty = document.createElement('li');
                empty.className = 'search-modal__message'; empty.textContent = 'Try another name, or view all search results below.';
                products.appendChild(empty);
              }
            } catch (error) {
              if (error.name === 'AbortError' || current !== sequence || !search.open) return;
              label.textContent = 'Continue your search';
              status.textContent = 'Suggestions unavailable. Use View all results or press Enter to search.';
              var message = document.createElement('li');
              message.className = 'search-modal__message'; message.textContent = 'Press Enter or select View all results to search the store.';
              products.replaceChildren(message);
            } finally {
              if (current === sequence) products.removeAttribute('aria-busy');
            }
          }, 180);
        }, options);
        search.addEventListener('keydown', function (event) {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
          var links = Array.from(products.querySelectorAll('a'));
          if (!links.length) return;
          var index = links.indexOf(document.activeElement);
          if (document.activeElement !== input && index === -1) return;
          event.preventDefault();
          if (event.key === 'ArrowDown') links[Math.min(index + 1, links.length - 1)].focus();
          else if (index <= 0) input.focus();
          else links[index - 1].focus();
        }, options);
        header.sfraSearchCleanup = function () {
          cancelRequest();
          if (search.open) search.close();
          document.body.classList.remove('search-modal-open');
          search.remove();
        };
      }
      function setSubmenu(button, open) {
        var panel = header.querySelector('[id="' + button.getAttribute('aria-controls') + '"]');
        if (!panel) return;
        button.setAttribute('aria-expanded', String(open));
        panel.hidden = !open;
        if (!open) panel.querySelectorAll('[data-submenu-toggle]').forEach(function (child) {
          setSubmenu(child, false);
        });
      }
      function closeSubmenus() {
        header.querySelectorAll('[data-submenu-toggle]').forEach(function (button) { setSubmenu(button, false); });
      }
      header.addEventListener('click', function (event) {
        var button = event.target.closest('[data-submenu-toggle]');
        if (button) {
          var open = button.getAttribute('aria-expanded') !== 'true';
          var item = button.closest('li');
          Array.prototype.forEach.call(item.parentElement.children, function (sibling) {
            if (sibling !== item) sibling.querySelectorAll('[data-submenu-toggle]').forEach(function (other) { setSubmenu(other, false); });
          });
          setSubmenu(button, open);
        }
        if (event.target.closest('[data-nav-toggle]') && !document.body.classList.contains('nav-open')) closeSubmenus();
      }, options);
      header.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        var item = event.target.closest('.header__menu-item');
        if (item && !item.querySelector('[data-submenu-toggle][aria-expanded="true"]')) item = item.parentElement.closest('.header__menu-item');
        var button = item && item.querySelector('[data-submenu-toggle][aria-expanded="true"]');
        if (button) { event.preventDefault(); setSubmenu(button, false); button.focus(); }
        else if (toggle && document.body.classList.contains('nav-open')) {
          document.body.classList.remove('nav-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.focus();
        }
      }, options);
      document.addEventListener('click', function (event) { if (!header.contains(event.target)) closeSubmenus(); }, options);
      header.sfraNavigation = controller;
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

    /* Each contact dropdown controls its own Other field. */
    root.querySelectorAll('[data-contact-choice]').forEach(function (choice) {
      if (choice.sfraChoice) return;
      choice.sfraChoice = true;
      var select = choice.querySelector('[data-contact-choice-select]');
      var other = choice.querySelector('[data-contact-choice-other]');
      var input = other.querySelector('input');
      function sync() {
        var show = select.value === 'Other';
        other.hidden = !show;
        input.required = show;
        input.disabled = !show;
      }
      var controller = new AbortController();
      choice.sfraChoiceController = controller;
      var events = { signal: controller.signal };
      var wrap = select.parentElement;
      var trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'contact-select__trigger';
      trigger.id = select.id + '-trigger';
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');
      var panel = document.createElement('div');
      panel.className = 'contact-select__panel';
      panel.hidden = true;
      var search = document.createElement('input');
      search.type = 'search';
      search.className = 'contact-select__search';
      search.placeholder = 'Type to search?';
      search.setAttribute('aria-label', 'Search dropdown options');
      search.autocomplete = 'off';
      var list = document.createElement('div');
      list.className = 'contact-select__options';
      list.id = select.id + '-options';
      list.setAttribute('role', 'listbox');
      var label = choice.querySelector('label');
      list.setAttribute('aria-label', label.textContent.trim());
      trigger.setAttribute('aria-controls', list.id);
      panel.append(search, list);
      wrap.append(trigger, panel);
      select.hidden = true;
      label.setAttribute('for', trigger.id);
      var entries = Array.from(select.options).filter(function (option) { return option.value !== ''; });
      function close() { panel.hidden = true; trigger.setAttribute('aria-expanded', 'false'); }
      function render() {
        var query = search.value.trim().toLocaleLowerCase();
        list.replaceChildren();
        var matches = entries.filter(function (option) { return option.value === 'Other' || option.textContent.toLocaleLowerCase().includes(query); });
        matches.forEach(function (option) {
          var button = document.createElement('button');
          button.type = 'button';
          button.className = 'contact-select__option';
          button.textContent = option.textContent;
          button.setAttribute('role', 'option');
          button.setAttribute('aria-selected', String(select.value === option.value));
          button.addEventListener('click', function () {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            close(); trigger.focus();
          });
          list.appendChild(button);
        });
      }
      function update() {
        sync();
        var selected = select.options[select.selectedIndex];
        trigger.textContent = selected ? selected.textContent : 'Select an option';
        trigger.setAttribute('aria-label', label.textContent.trim() + ': ' + trigger.textContent);
      }
      trigger.addEventListener('click', function () {
        if (!panel.hidden) { close(); return; }
        panel.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        search.value = ''; render(); search.focus();
      }, events);
      search.addEventListener('input', render, events);
      search.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') { event.preventDefault(); var first = list.querySelector('button'); if (first) first.click(); }
      }, events);
      choice.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); close(); trigger.focus(); return; }
        if (panel.hidden || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
        var options = Array.from(list.querySelectorAll('button'));
        if (!options.length) return;
        var index = options.indexOf(document.activeElement);
        event.preventDefault();
        if (event.key === 'ArrowDown') options[Math.min(index + 1, options.length - 1)].focus();
        else if (index <= 0) search.focus();
        else options[index - 1].focus();
      }, events);
      choice.addEventListener('focusout', function (event) { if (!choice.contains(event.relatedTarget)) close(); }, events);
      document.addEventListener('click', function (event) { if (!choice.contains(event.target)) close(); }, events);
      select.addEventListener('change', update, events);
      select.closest('form').addEventListener('reset', function () { setTimeout(function () { close(); update(); }, 0); }, events);
      update();
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

    /* Quantity controls preserve native form submission and Shopify quantity rules. */
    root.querySelectorAll('[data-quantity-control]').forEach(function (control) {
      if (control.sfraQuantity) return;
      control.sfraQuantity = true;
      var input = control.querySelector('[data-quantity-input]');
      var minus = control.querySelector('[data-quantity-minus]');
      var plus = control.querySelector('[data-quantity-plus]');
      function limits() {
        return { min: Number(input.min) || 0, step: Number(input.step) || 1, max: input.max === '' ? Infinity : Number(input.max), order: Number(input.getAttribute('data-min-order')) || Number(input.min) || 1 };
      }
      function sync() {
        var rule = limits();
        minus.disabled = Number(input.value) <= rule.min;
        plus.disabled = Number(input.value) >= rule.max;
      }
      function change(direction) {
        var rule = limits();
        var value = Number(input.value);
        if (!Number.isFinite(value)) value = rule.min;
        var next = value + direction * rule.step;
        if (rule.min === 0 && direction > 0 && value === 0) next = rule.order;
        if (rule.min === 0 && next < rule.order) next = 0;
        input.value = Math.min(rule.max, Math.max(rule.min, next));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      minus.addEventListener('click', function () { change(-1); });
      plus.addEventListener('click', function () { change(1); });
      input.addEventListener('change', sync);
      sync();
    });

    /* ---- Product page: variants + gallery ---- */
    var product = root.querySelector('[data-product]');
    if (product) {
      var productForm = product.querySelector('.product-form');
      if (productForm && !productForm.sfraSubmitGuard) {
        productForm.sfraSubmitGuard = true;
        productForm.addEventListener('submit', function (event) {
          if (event.defaultPrevented) return;
          if (productForm.dataset.submitting === 'true') { event.preventDefault(); return; }
          productForm.dataset.submitting = 'true';
          var button = productForm.querySelector('[data-add-btn]');
          if (button) {
            button.dataset.originalLabel = button.textContent;
            button.dataset.originalDisabled = String(button.disabled);
            button.disabled = true; button.textContent = 'Adding?';
          }
        });
      }
      var jsonEl = product.querySelector('[data-product-json]');
      var priceEl = product.querySelector('[data-variant-prices]');
      if (jsonEl && priceEl) {
        var data = JSON.parse(jsonEl.textContent);
        var extra = JSON.parse(priceEl.textContent);
        var selects = product.querySelectorAll('[data-option-index]');
        var idInput = product.querySelector('[data-variant-id]');
        var priceOut = product.querySelector('[data-price]');
        var addBtn = product.querySelector('[data-add-btn]');
        var buyNow = product.querySelector('[data-buy-now]');
        var quantity = product.querySelector('[data-quantity-input]');

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
            if (buyNow) { buyNow.hidden = true; buyNow.disabled = true; }
            idInput.value = '';
            addBtn.disabled = true;
            addBtn.textContent = 'Unavailable';
            return;
          }
          var info = extra[String(variant.id)];
          idInput.value = variant.id;
          idInput.dispatchEvent(new Event('change', { bubbles: true }));
          if (info) {
            priceOut.innerHTML = (info.compare ? '<s>' + info.compare + '</s> ' : '') + '<span>' + info.price + '</span>';
            if (buyNow) { buyNow.hidden = !info.available; buyNow.disabled = !info.available; }
            if (quantity) {
              quantity.min = info.quantity_min;
              quantity.step = info.quantity_step;
              quantity.max = info.quantity_max || '';
              var count = Math.max(info.quantity_min, Number(quantity.value) || info.quantity_min);
              count = info.quantity_min + Math.ceil((count - info.quantity_min) / info.quantity_step) * info.quantity_step;
              if (info.quantity_max) count = Math.min(count, info.quantity_max);
              quantity.value = count;
              quantity.dispatchEvent(new Event('change', { bubbles: true }));
            }
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
  window.addEventListener('pageshow', function (event) {
    if (!event.persisted) return;
    document.querySelectorAll('.product-form').forEach(function (form) {
      delete form.dataset.submitting;
      var button = form.querySelector('[data-add-btn]');
      if (button && button.dataset.originalLabel) {
        button.textContent = button.dataset.originalLabel;
        button.disabled = button.dataset.originalDisabled === 'true';
      }
    });
  });
  document.addEventListener('shopify:section:load', function (event) {
    initTheme(event.target);
  });
  document.addEventListener('shopify:section:unload', function (event) {
    event.target.querySelectorAll('[data-hero]').forEach(function (hero) {
      if (hero.sfraHero) hero.sfraHero.stop();
    });
    event.target.querySelectorAll('[data-contact-choice]').forEach(function (choice) {
      if (choice.sfraChoiceController) choice.sfraChoiceController.abort();
    });
    var header = event.target.querySelector('[data-header]');
    if (header) {
      if (header.sfraSearchCleanup) header.sfraSearchCleanup();
      if (header.sfraNavigation) header.sfraNavigation.abort();
      document.body.classList.remove('nav-open');
    }
  });
})();
