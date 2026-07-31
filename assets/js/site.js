/* Blue Radiance Marine Company — site interactions (no dependencies) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----- Navigation: solid state + read progress ----- */
  var nav = document.querySelector('.nav');
  if (nav) {
    var progress = nav.querySelector('.nav-progress');
    var ticking = false;
    var update = function () {
      if (!nav.classList.contains('is-solid')) {
        nav.classList.toggle('is-scrolled', window.scrollY > 24);
      }
      if (progress) {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.setProperty('--p', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
      }
      ticking = false;
    };
    update();
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
  }

  /* ----- Mobile menu ----- */
  var burger = document.querySelector('.nav-burger');
  var menu = document.getElementById('mobileMenu');
  if (burger && menu) {
    var setMenu = function (open) {
      burger.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
  }

  /* ----- Scroll reveals ----- */
  var revealables = document.querySelectorAll('.reveal, .media-reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* ----- Counters ----- */
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    var runCounter = function (el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      if (reduceMotion) { el.textContent = String(target); return; }
      var t0 = null;
      var dur = 1400;
      var step = function (ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            runCounter(entry.target);
            cio.unobserve(entry.target);
          }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { cio.observe(el); });
    } else {
      counters.forEach(runCounter);
    }
  }

  /* ----- Contact form: validate, then open a pre-filled email ----- */
  var form = document.getElementById('contactForm');
  if (form) {
    var statusBox = document.getElementById('formStatus');

    /* Pre-select service when arriving from a service page (?service=…) */
    var params = new URLSearchParams(window.location.search);
    var svc = params.get('service');
    var select = form.querySelector('select[name="service"]');
    if (svc && select) {
      Array.prototype.forEach.call(select.options, function (opt) {
        if (opt.value.toLowerCase() === svc.toLowerCase()) select.value = opt.value;
      });
    }

    var setInvalid = function (field, invalid) {
      var wrap = field.closest('.field');
      if (wrap) wrap.classList.toggle('invalid', invalid);
      field.setAttribute('aria-invalid', String(invalid));
      return !invalid;
    };

    var validate = function () {
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (field) {
        var valid = field.value.trim() !== '';
        if (valid && field.type === 'email') {
          valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim());
        }
        ok = setInvalid(field, !valid) && ok;
      });
      return ok;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) {
        statusBox.className = 'form-status error';
        statusBox.textContent = 'Please complete the highlighted fields before sending.';
        return;
      }
      var val = function (name) {
        var f = form.querySelector('[name="' + name + '"]');
        return f ? f.value.trim() : '';
      };
      var subject = 'Charter / Service Inquiry — ' + (val('service') || 'General') +
        (val('company') ? ' — ' + val('company') : '');
      var body = [
        'Inquiry submitted via theblueradiance.com',
        '',
        'Name:    ' + val('name'),
        'Company: ' + (val('company') || '—'),
        'Email:   ' + val('email'),
        'Phone:   ' + (val('phone') || '—'),
        'Service: ' + val('service'),
        '',
        'Requirement:',
        val('message')
      ].join('\n');
      window.location.href = 'mailto:operations@theblueradiance.com' +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
      statusBox.className = 'form-status success';
      statusBox.textContent = 'Your email app has opened with the inquiry pre-filled — press Send there to complete it. ' +
        'If nothing opened, email us directly at operations@theblueradiance.com.';
    });

    form.addEventListener('input', function (e) {
      if (e.target.matches('[required]')) setInvalid(e.target, false);
    });
  }
})();
