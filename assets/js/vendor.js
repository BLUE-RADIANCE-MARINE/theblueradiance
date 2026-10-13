/* Blue Radiance — Vendor Registration form.
   Self-contained; does not depend on or modify site.js.
   Submits a multipart application (fields + documents) to the vendor Worker.
   The Worker stores the record in Neon, the files in private object storage,
   and emails operations@. Submission is an APPLICATION ONLY — never approval. */
(function () {
  'use strict';

  var form = document.getElementById('vendorForm');
  if (!form) return;

  /* Set at deploy time to the deployed Worker URL. Until then the form
     degrades gracefully and points the applicant to email, never breaking. */
  var ENDPOINT = 'https://br-vendor-api.br-contact-form.workers.dev';
  var INBOX    = 'operations@theblueradiance.com';

  var MAX_FILE   = 10 * 1024 * 1024;        /* 10 MB per file   */
  var MAX_TOTAL  = 25 * 1024 * 1024;        /* 25 MB per submit */
  var OK_EXT     = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];

  var statusBox = document.getElementById('formStatus');
  var say = function (kind, html) {
    statusBox.className = 'form-status ' + kind;
    statusBox.innerHTML = html;
  };
  var fieldEl = function (el) {
    while (el && el !== form) {
      if (el.classList && el.classList.contains('field')) return el;
      el = el.parentNode;
    }
    return null;
  };
  var flag = function (el, bad) {
    var f = fieldEl(el);
    if (f) f.classList[bad ? 'add' : 'remove']('invalid');
  };
  var emailOk = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); };
  var extOf = function (name) {
    var i = name.lastIndexOf('.');
    return i < 0 ? '' : name.slice(i + 1).toLowerCase();
  };

  /* Live-clear the error state once a field is corrected. */
  form.addEventListener('input', function (e) {
    if (e.target && e.target.closest && e.target.closest('.field')) flag(e.target, false);
  });

  function validate() {
    var firstBad = null;
    var fail = function (el) { flag(el, true); if (!firstBad) firstBad = el; };

    /* required text/select fields */
    ['company_name', 'cr_number', 'country', 'city', 'contact_name', 'email', 'phone']
      .forEach(function (n) {
        var el = form.elements[n];
        if (!el) return;
        if (!el.value.trim()) fail(el);
        else flag(el, false);
      });

    var em = form.elements['email'];
    if (em && em.value.trim() && !emailOk(em.value.trim())) fail(em);

    /* at least one service category */
    var cats = form.querySelectorAll('input[name="categories"]:checked');
    var catField = form.querySelector('.cat-grid');
    if (!cats.length) { if (catField) fieldEl(catField).classList.add('invalid'); if (!firstBad) firstBad = catField; }
    else if (catField) fieldEl(catField).classList.remove('invalid');

    /* required documents */
    ['doc_company_profile', 'doc_cr'].forEach(function (n) {
      var el = form.elements[n];
      if (!el) return;
      if (!el.files || !el.files.length) fail(el);
      else flag(el, false);
    });

    /* file type / size across every file input */
    var total = 0, fileErr = '';
    var inputs = form.querySelectorAll('input[type="file"]');
    for (var i = 0; i < inputs.length; i++) {
      var files = inputs[i].files || [];
      for (var j = 0; j < files.length; j++) {
        var f = files[j];
        total += f.size;
        if (OK_EXT.indexOf(extOf(f.name)) < 0) {
          fileErr = 'Unsupported file type: "' + f.name + '". Allowed: PDF, DOC, DOCX, JPG, PNG.';
          fail(inputs[i]);
        } else if (f.size > MAX_FILE) {
          fileErr = '"' + f.name + '" is larger than 10 MB. Please upload a smaller file.';
          fail(inputs[i]);
        }
      }
    }
    if (!fileErr && total > MAX_TOTAL) {
      fileErr = 'The total size of all documents exceeds 25 MB. Please reduce the attachments.';
      if (!firstBad) firstBad = inputs[0];
    }

    /* consent */
    var consent = form.elements['consent'];
    if (consent && !consent.checked) { fail(consent); }

    return { ok: !firstBad && !fileErr, firstBad: firstBad, fileErr: fileErr };
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    /* Honeypot — real people never fill this hidden checkbox. */
    var trap = form.querySelector('[name="botcheck"]');
    if (trap && (trap.type === 'checkbox' ? trap.checked : trap.value)) return;

    var v = validate();
    if (!v.ok) {
      say('error', v.fileErr || 'Please complete the highlighted fields before submitting.');
      if (v.firstBad && v.firstBad.focus) { try { v.firstBad.focus(); } catch (x) {} }
      if (v.firstBad && v.firstBad.scrollIntoView) v.firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!ENDPOINT) {
      say('error',
        'Online submission is not available just now. Please email your company profile and ' +
        'documents to <a href="mailto:' + INBOX + '">' + INBOX + '</a> or call ' +
        '<a href="tel:+966136633697">+966 13 663 3697</a>.');
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.querySelector('span') : null;
    var original = label ? label.textContent : '';
    if (btn) btn.disabled = true;
    if (label) label.textContent = 'Submitting…';
    say('', '');

    var fd = new FormData(form);
    fd.delete('botcheck');
    fd.append('page', window.location.href);
    fd.append('submitted', new Date().toISOString());

    fetch(ENDPOINT, { method: 'POST', body: fd })
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
            '<strong>Thank you for applying.</strong> Your vendor registration application has been ' +
            'received and is subject to review by Blue Radiance Marine Company. Submission of this ' +
            'application does not constitute vendor approval, appointment or any commitment to award ' +
            'business. Our team will contact you if further information is required.' +
            (data.reference ? '<br><span style="opacity:.8">Reference: ' + data.reference + '</span>' : ''));
          if (statusBox.scrollIntoView) statusBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          throw new Error((data && data.message) || 'rejected');
        }
      })
      .catch(function () {
        say('error',
          'We could not submit your application just now. Please try again, or email your documents to ' +
          '<a href="mailto:' + INBOX + '">' + INBOX + '</a>.');
      })
      .then(function () {
        if (btn) btn.disabled = false;
        if (label) label.textContent = original;
      });
  });
})();
