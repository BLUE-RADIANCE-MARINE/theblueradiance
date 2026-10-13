/* Blue Radiance Marine Company, site interactions (no dependencies) */
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

  /* ----- Scroll reveals -----
     Failsafe: whatever happens, everything is revealed within 3s. The hidden
     start-state only exists while html.js is set, so content is never lost. */
  var revealables = document.querySelectorAll('.reveal, .media-reveal');
  var revealAll = function () {
    revealables.forEach(function (el) { el.classList.add('in-view'); });
  };
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
    setTimeout(revealAll, 3000);
  } else {
    revealAll();
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

    /* ------------------------------------------------------------------
       WHERE INQUIRIES GO
       Inquiries are POSTed to a Cloudflare Worker which sends the email
       through Microsoft Graph as operations@theblueradiance.com, using an app
       registration in the Blue Radiance Microsoft 365 tenant. The mail comes
       from Blue Radiance's own tenant, no third-party form service receives
       the data, and nothing is stored anywhere.

       Source: github.com/BLUE-RADIANCE-MARINE/br-contact-api
       Notes:  .github/CONTACT-FORM.md

       Until the URL is set the form falls back to opening the visitor's mail
       app. That fallback does NOT deliver anything on its own; the visitor
       still has to press Send.

       The request is sent as text/plain so the browser treats it as a CORS
       "simple request" and skips the OPTIONS preflight. The body is still
       JSON; the function parses it either way.
       ------------------------------------------------------------------ */
    var ENDPOINT = 'https://br-contact-form.br-contact-form.workers.dev';
    var INBOX    = 'operations@theblueradiance.com';

    var val = function (name) {
      var f = form.querySelector('[name="' + name + '"]');
      return f ? f.value.trim() : '';
    };
    var buildSubject = function () {
      return 'Website inquiry, ' + (val('service') || 'General') +
             (val('company') ? ', ' + val('company') : '');
    };
    var buildBody = function () {
      return [
        'Inquiry submitted via theblueradiance.com',
        '',
        'Name:    ' + val('name'),
        'Company: ' + (val('company') || '-'),
        'Email:   ' + val('email'),
        'Phone:   ' + (val('phone') || '-'),
        'Service: ' + val('service'),
        '',
        'Requirement:',
        val('message')
      ].join('\n');
    };
    var mailtoHref = function () {
      return 'mailto:' + INBOX + '?subject=' + encodeURIComponent(buildSubject()) +
             '&body=' + encodeURIComponent(buildBody());
    };
    var say = function (kind, html) {
      statusBox.className = 'form-status ' + kind;
      statusBox.innerHTML = html;
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) {
        say('error', 'Please complete the highlighted fields before sending.');
        return;
      }

      /* Honeypot, real people never fill this. A checkbox always reports
         value "on", so it must be read via .checked, not .value. */
      var trap = form.querySelector('[name="botcheck"]');
      if (trap && (trap.type === 'checkbox' ? trap.checked : trap.value)) return;

      var btn = form.querySelector('button[type="submit"]');
      var label = btn ? btn.querySelector('span') : null;
      var original = label ? label.textContent : '';

      /* No endpoint configured yet, degrade, never break. */
      if (!ENDPOINT) {
        /* Show the message BEFORE attempting the mail app. Assigning a mailto
           the browser cannot handle silently halts the rest of the handler,
           which is why the old form appeared to do nothing at all. */
        say('error',
          'Please send your requirement to ' +
          '<a href="mailto:' + INBOX + '">' + INBOX + '</a> or call ' +
          '<a href="tel:+966136633697">+966 13 663 3697</a>. ' +
          '<a href="' + mailtoHref() + '">Open a pre-filled email</a>.');
        return;
      }

      if (btn) { btn.disabled = true; }
      if (label) { label.textContent = 'Sending…'; }
      say('', '');

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: JSON.stringify({
          subject: buildSubject(),
          name: val('name'),
          company: val('company') || '-',
          email: val('email'),
          phone: val('phone') || '-',
          service: val('service'),
          message: val('message'),
          body: buildBody(),
          page: window.location.href,
          submitted: new Date().toISOString()
        })
      })
      /* A Logic App Response action returning 200 with no body is a perfectly
         good success signal, so fall back to the HTTP status when the body is
         not JSON. */
      .then(function (r) {
        return r.json().then(
          function (j) { return (j && typeof j.success !== 'undefined') ? j : { success: r.ok }; },
          function () { return { success: r.ok }; }
        );
      })
      .then(function (data) {
        if (data && data.success) {
          form.reset();
          say('success',
            'Thank you, your inquiry has been sent to our operations team. ' +
            'We respond around the clock and will be in touch shortly.');
        } else {
          throw new Error((data && data.message) || 'Submission rejected');
        }
      })
      .catch(function () {
        say('error',
          'We could not send that just now. Please email ' +
          '<a href="mailto:' + INBOX + '">' + INBOX + '</a> or call ' +
          '<a href="tel:+966136633697">+966 13 663 3697</a>, ' +
          '<a href="' + mailtoHref() + '">open a pre-filled email</a>.');
      })
      .then(function () {
        if (btn) { btn.disabled = false; }
        if (label) { label.textContent = original; }
      });
    });

    form.addEventListener('input', function (e) {
      if (e.target.matches('[required]')) setInvalid(e.target, false);
    });
  }
})();
