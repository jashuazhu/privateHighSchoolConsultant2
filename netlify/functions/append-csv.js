'use strict';

// Netlify Function: Append a sanitized CSV row to /data/submissions.csv in GitHub
// Requires env vars: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH

const PATH = 'data/submissions.csv';

function b64(s) {
  return Buffer.from(s, 'utf8').toString('base64');
}

function fromB64(b) {
  return Buffer.from(b, 'base64').toString('utf8');
}

function sanitizeCell(value) {
  let v = value == null ? '' : String(value);
  // Strip CR/LF
  v = v.replace(/[\r\n]+/g, ' ').trim();
  // Prevent CSV injection
  if (/^[=+\-@]/.test(v)) v = "'" + v;
  // Escape quotes by doubling
  if (/[",]/.test(v)) {
    v = '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function ensureArray(x) {
  if (Array.isArray(x)) return x;
  if (x == null || x === '') return [];
  return [x];
}

function buildRow(payload) {
  const ts = new Date().toISOString();
  const cols = {
    timestamp: ts,
    parent_name: payload.parent_name || '',
    email: payload.email || '',
    phone: payload.phone || '',
    student_name: payload.student_name || '',
    current_grade: payload.current_grade || '',
    target_entry_year: payload.target_entry_year || '',
    region: ensureArray(payload.region).join('; '),
    boarding: payload.boarding || '',
    school_size: payload.school_size || '',
    standardized_tests: ensureArray(payload.standardized_tests).join('; '),
    target_ranking_tier: payload.target_ranking_tier || '',
    interests: payload.interests || '',
    budget: payload.budget || '',
    notes: payload.notes || ''
  };
  const ordered = [
    'timestamp','parent_name','email','phone','student_name','current_grade','target_entry_year',
    'region','boarding','school_size','standardized_tests','target_ranking_tier','interests','budget','notes'
  ];
  const cells = ordered.map(k => sanitizeCell(cols[k]));
  return { header: ordered.join(','), row: cells.join(',') };
}

async function getFileMeta({ owner, repo, branch, path, token }) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: { Authorization: `token ${token}`, 'User-Agent': 'netlify-function-append-csv' } });
  if (res.status === 404) return { exists: false };
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
  const json = await res.json();
  return { exists: true, sha: json.sha, content: fromB64(json.content || '') };
}

async function putFile({ owner, repo, branch, path, token, content, sha, message }) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodedPath}`;
  const body = {
    message: message || 'append submission',
    content: b64(content),
    branch
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'netlify-function-append-csv'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`GitHub PUT failed: ${res.status} ${t}`);
  }
  return res.json();
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

exports.handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO || !GITHUB_BRANCH) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Missing GitHub env vars' }) };
  }

  // Parse JSON or x-www-form-urlencoded bodies
  let payload = {};
  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  const ctype = (event.headers && (event.headers['content-type'] || event.headers['Content-Type'])) || '';
  try {
    if (/application\/json/i.test(ctype)) {
      payload = JSON.parse(raw || '{}');
    } else if (/application\/x-www-form-urlencoded/i.test(ctype)) {
      const params = new URLSearchParams(raw);
      // Collect all keys, including duplicates into arrays
      const obj = {};
      for (const [k, v] of params.entries()) {
        if (obj[k] == null) obj[k] = v;
        else if (Array.isArray(obj[k])) obj[k].push(v);
        else obj[k] = [obj[k], v];
      }
      payload = obj;
    } else {
      // Fallback: attempt JSON first, otherwise treat as empty
      payload = raw ? JSON.parse(raw) : {};
    }
  } catch (_) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  // Basic validation for key required fields
  const required = ['parent_name', 'email', 'student_name'];
  for (const k of required) {
    if (!payload[k] || String(payload[k]).trim() === '') {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: `Missing required field: ${k}` }) };
    }
  }

  try {
    const { header, row } = buildRow(payload);
    const meta = await getFileMeta({ owner: GITHUB_OWNER, repo: GITHUB_REPO, branch: GITHUB_BRANCH, path: PATH, token: GITHUB_TOKEN });
    let content = '';
    if (meta.exists) {
      content = meta.content.trimEnd();
      content = content ? content + '\n' + row + '\n' : header + '\n' + row + '\n';
    } else {
      content = header + '\n' + row + '\n';
    }
    await putFile({ owner: GITHUB_OWNER, repo: GITHUB_REPO, branch: GITHUB_BRANCH, path: PATH, token: GITHUB_TOKEN, content, sha: meta.sha, message: 'append submission' });
    return { statusCode: 200, headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 502, headers: corsHeaders(), body: JSON.stringify({ error: String(err.message || err) }) };
  }
};
