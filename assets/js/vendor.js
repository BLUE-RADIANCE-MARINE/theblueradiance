/* Blue Radiance, Vendor Registration form.
   Self-contained; does not depend on or modify site.js.
   Submits a multipart application (fields + documents) to the vendor Worker.
   The Worker stores the record in Neon, the files in private object storage,
   and emails operations@. Submission is an APPLICATION ONLY, never approval. */
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

  /* Each file field shows the chosen file(s) with size + a per-file Remove (✕),
     and a count for the multi-file fields. Selections accumulate so a vendor can
     add files across several picks; removing rebuilds the input via DataTransfer. */
  var fmtSize = function (b) {
    return b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  };
  var canDT = (function () { try { new DataTransfer(); return true; } catch (e) { return false; } })();
  Array.prototype.forEach.call(form.querySelectorAll('input[type="file"]'), function (inp) {
    var multiple = inp.multiple;
    var list = document.createElement('div');
    list.className = 'file-list';
    inp.parentNode.insertBefore(list, inp.nextSibling);
    var store = [];
    var apply = function () {
      if (canDT) { var dt = new DataTransfer(); store.forEach(function (f) { dt.items.add(f); }); inp.files = dt.files; }
      render();
    };
    var render = function () {
      list.innerHTML = '';
      var files = canDT ? store : Array.prototype.slice.call(inp.files || []);
      if (!files.length) { list.classList.remove('has'); return; }
      list.classList.add('has');
      if (multiple) {
        var h = document.createElement('div');
        h.className = 'file-count';
        h.textContent = files.length + (files.length > 1 ? ' files selected' : ' file selected');
        list.appendChild(h);
      }
      files.forEach(function (f, i) {
        var chip = document.createElement('div'); chip.className = 'file-chip';
        var name = document.createElement('span'); name.className = 'fc-name';
        name.textContent = f.name;
        var sz = document.createElement('span'); sz.className = 'fc-size'; sz.textContent = fmtSize(f.size);
        name.appendChild(sz); chip.appendChild(name);
        var x = document.createElement('button');
        x.type = 'button'; x.className = 'fc-x'; x.setAttribute('aria-label', 'Remove ' + f.name); x.textContent = '✕';
        x.addEventListener('click', function () {
          if (canDT) { store.splice(i, 1); apply(); }
          else { inp.value = ''; render(); }
          flag(inp, false);
        });
        chip.appendChild(x); list.appendChild(chip);
      });
    };
    inp.addEventListener('change', function () {
      var incoming = Array.prototype.slice.call(inp.files || []);
      if (!canDT) { render(); return; }
      if (multiple) {
        incoming.forEach(function (f) {
          if (!store.some(function (s) { return s.name === f.name && s.size === f.size && s.lastModified === f.lastModified; })) store.push(f);
        });
      } else {
        store = incoming.slice(0, 1);
      }
      apply();
    });
  });

  function validate() {
    var firstBad = null;
    var fail = function (el) { flag(el, true); if (!firstBad) firstBad = el; };

    /* required text/select fields */
    ['company_name', 'cr_number', 'country', 'city', 'contact_name', 'email']
      .forEach(function (n) {
        var el = form.elements[n];
        if (!el) return;
        if (!el.value.trim()) fail(el);
        else flag(el, false);
      });

    var em = form.elements['email'];
    if (em && em.value.trim() && !emailOk(em.value.trim())) fail(em);

    /* phone, validate the national number (6–15 digits), country code handled separately */
    var pnum = form.querySelector('.phone-num');
    if (pnum) {
      var pd = (pnum.value || '').replace(/\D/g, '');
      if (pd.length < 6 || pd.length > 15) fail(pnum);
      else flag(pnum, false);
    }

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

    /* Honeypot, real people never fill this hidden checkbox. */
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
