/* Blue Radiance — shared form helpers: country dropdown + phone with dialing code.
   Used by the Vendor Registration and Contact forms. No external dependencies.
   Enhance:  <select data-country>  and  <div data-phone> ... </div>
   Default country: Saudi Arabia. */
(function () {
  'use strict';

  /* name|ISO2|dialcode — comprehensive, Gulf/MENA/South-Asia first-class. */
  var RAW = [
    'Saudi Arabia|SA|966', 'United Arab Emirates|AE|971', 'Bahrain|BH|973', 'Kuwait|KW|965',
    'Oman|OM|968', 'Qatar|QA|974', 'Yemen|YE|967', 'Iraq|IQ|964', 'Jordan|JO|962',
    'Lebanon|LB|961', 'Syria|SY|963', 'Egypt|EG|20', 'Sudan|SD|249', 'Libya|LY|218',
    'Tunisia|TN|216', 'Algeria|DZ|213', 'Morocco|MA|212', 'Turkey|TR|90', 'Iran|IR|98',
    'India|IN|91', 'Pakistan|PK|92', 'Bangladesh|BD|880', 'Sri Lanka|LK|94', 'Nepal|NP|977',
    'Afghanistan|AF|93', 'Philippines|PH|63', 'Indonesia|ID|62', 'Malaysia|MY|60',
    'Singapore|SG|65', 'Thailand|TH|66', 'Vietnam|VN|84', 'China|CN|86', 'Hong Kong|HK|852',
    'Japan|JP|81', 'South Korea|KR|82', 'Taiwan|TW|886', 'Myanmar|MM|95', 'Cambodia|KH|855',
    'United Kingdom|GB|44', 'Ireland|IE|353', 'France|FR|33', 'Germany|DE|49', 'Netherlands|NL|31',
    'Belgium|BE|32', 'Luxembourg|LU|352', 'Spain|ES|34', 'Portugal|PT|351', 'Italy|IT|39',
    'Switzerland|CH|41', 'Austria|AT|43', 'Greece|GR|30', 'Norway|NO|47', 'Sweden|SE|46',
    'Denmark|DK|45', 'Finland|FI|358', 'Poland|PL|48', 'Czech Republic|CZ|420', 'Romania|RO|40',
    'Hungary|HU|36', 'Russia|RU|7', 'Ukraine|UA|380', 'Cyprus|CY|357', 'Malta|MT|356',
    'United States|US|1', 'Canada|CA|1', 'Mexico|MX|52', 'Brazil|BR|55', 'Argentina|AR|54',
    'Chile|CL|56', 'Colombia|CO|57', 'Peru|PE|51', 'Panama|PA|507', 'Venezuela|VE|58',
    'South Africa|ZA|27', 'Nigeria|NG|234', 'Kenya|KE|254', 'Ethiopia|ET|251', 'Ghana|GH|233',
    'Tanzania|TZ|255', 'Uganda|UG|256', 'Angola|AO|244', 'Mozambique|MZ|258', 'Djibouti|DJ|253',
    'Somalia|SO|252', 'Eritrea|ER|291', 'Senegal|SN|221', 'Ivory Coast|CI|225', 'Cameroon|CM|237',
    'Australia|AU|61', 'New Zealand|NZ|64', 'Fiji|FJ|679', 'Papua New Guinea|PG|675',
    'Kazakhstan|KZ|7', 'Uzbekistan|UZ|998', 'Azerbaijan|AZ|994', 'Georgia|GE|995', 'Armenia|AM|374',
    'Maldives|MV|960', 'Mauritius|MU|230', 'Seychelles|SC|248', 'Bhutan|BT|975', 'Brunei|BN|673',
    'Mongolia|MN|976', 'Laos|LA|856', 'Palestine|PS|970', 'Israel|IL|972', 'Bulgaria|BG|359',
    'Croatia|HR|385', 'Serbia|RS|381', 'Slovakia|SK|421', 'Slovenia|SI|386', 'Lithuania|LT|370',
    'Latvia|LV|371', 'Estonia|EE|372', 'Iceland|IS|354', 'Albania|AL|355', 'Belarus|BY|375'
  ];
  var COUNTRIES = RAW.map(function (r) { var p = r.split('|'); return { name: p[0], iso: p[1], dial: p[2] }; });
  COUNTRIES.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  var DEFAULT_ISO = 'SA';

  function fillCountry(sel) {
    var cur = sel.getAttribute('data-value') || DEFAULT_ISO;
    var ph = document.createElement('option');
    ph.value = ''; ph.textContent = 'Select country…';
    sel.appendChild(ph);
    COUNTRIES.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.name; o.setAttribute('data-iso', c.iso);
      o.textContent = c.name;
      if (c.iso === cur) o.selected = true;
      sel.appendChild(o);
    });
  }

  function enhancePhone(wrap) {
    var code = wrap.querySelector('.phone-code');
    var num = wrap.querySelector('.phone-num');
    var hidden = wrap.querySelector('input[type="hidden"]');
    if (!code || !num || !hidden) return;
    COUNTRIES.forEach(function (c) {
      var o = document.createElement('option');
      o.value = '+' + c.dial;
      o.textContent = '+' + c.dial + '  ' + c.iso;
      o.title = c.name;
      if (c.iso === DEFAULT_ISO) o.selected = true;
      code.appendChild(o);
    });
    var sync = function () {
      var digits = (num.value || '').replace(/[^\d]/g, '');
      hidden.value = digits ? (code.value + ' ' + digits) : '';
      wrap.setAttribute('data-digits', digits.length);
    };
    num.addEventListener('input', function () {
      num.value = num.value.replace(/[^\d\s()+-]/g, '');   // allow only phone-ish chars
      sync();
    });
    code.addEventListener('change', sync);
    sync();
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('select[data-country]'), fillCountry);
    Array.prototype.forEach.call(document.querySelectorAll('[data-phone]'), enhancePhone);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
