(function () {
  const $ = (sel, root = document) => root.querySelector(sel);

  function setYear() {
    const y = new Date().getFullYear();
    const el = document.getElementById('year');
    if (el) el.textContent = y;
  }

  function toParagraphs(text) {
    const cleaned = text.replace(/\r\n/g, '\n').trim();
    if (!cleaned) return [];
    // Prefer double line breaks as paragraph separators; fallback to single lines.
    const blocks = cleaned.includes('\n\n') ? cleaned.split(/\n\n+/) : cleaned.split(/\n+/);
    return blocks.map(b => b.trim()).filter(Boolean);
  }

  async function loadTextInto(containerSelector, url) {
    const container = $(containerSelector);
    if (!container) return;
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (!res.ok) return; // silently ignore missing optional content
      const txt = await res.text();
      const paras = toParagraphs(txt);
      container.innerHTML = '';
      for (const p of paras) {
        const el = document.createElement('p');
        el.textContent = p;
        container.appendChild(el);
      }
    } catch (_) {
      // ignore
    }
  }

  function collectFormJSON(form) {
    const data = {};
    const fd = new FormData(form);

    for (const [key, value] of fd.entries()) {
      // multiple values: accumulate into arrays
      if (key in data) {
        if (Array.isArray(data[key])) data[key].push(value);
        else data[key] = [data[key], value];
      } else {
        data[key] = value;
      }
    }

    // region (multi-select) – ensure array
    const regionSel = form.querySelector('select[name="region"]');
    if (regionSel) {
      const selected = Array.from(regionSel.selectedOptions).map(o => o.value);
      data.region = selected;
    }

    // standardized_tests – ensure array of checked boxes
    const checks = Array.from(form.querySelectorAll('input[name="standardized_tests"]:checked'));
    data.standardized_tests = checks.map(c => c.value);

    // normalize required fields (trim strings)
    const normalize = k => (typeof data[k] === 'string' ? data[k].trim() : data[k]);
    ['parent_name', 'email', 'student_name'].forEach(k => { if (data[k]) data[k] = normalize(k); });

    return data;
  }

  async function handleFunctionSubmit(form, statusEl) {
    statusEl.textContent = '';
    const data = collectFormJSON(form);
    try {
      statusEl.textContent = 'Submitting…';
      const res = await fetch('/.netlify/functions/append-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Submission failed');
      statusEl.textContent = 'Thanks! Submission received.';
      statusEl.classList.remove('error');
      statusEl.classList.add('ok');
      setTimeout(() => { window.location.assign('/success'); }, 800);
    } catch (err) {
      statusEl.textContent = String(err.message || err || 'Error submitting');
      statusEl.classList.remove('ok');
      statusEl.classList.add('error');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    setYear();

    // Index bottom content
    if (document.body && document.body.contains(document.querySelector('#index-doc'))) {
      loadTextInto('#index-doc', '/assets/doc/index.txt');
    }

    // Survey lead-in content (optional)
    if (document.body && document.body.contains(document.querySelector('#survey-intro'))) {
      loadTextInto('#survey-intro', '/assets/doc/survey_intro.txt');
    }

    // Optional function submit
    const form = document.querySelector('form[name="survey"]');
    const statusEl = document.getElementById('form-status');
    if (form && form.hasAttribute('data-use-function')) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleFunctionSubmit(form, statusEl || form);
      });
    }
  });
})();

