/*
 * AI Hacker Studio — standalone server.
 *
 * Node.js standard library only (zero dependencies).
 * Serves public/ and a small JSON API. Progress, journal entries and
 * reports are persisted to data/data.json, created from data/seed.json
 * on first run. The seed is empty: the standalone copy starts fresh.
 *
 * Run:  node server.js        (then open http://localhost:3000)
 * Port: PORT env var, default 3000.
 */

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data', 'data.json');
const SEED_FILE = path.join(ROOT, 'data', 'seed.json');
const PUBLIC_DIR = path.join(ROOT, 'public');

function loadSeed() {
  return JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
}

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(loadSeed(), null, 2) + '\n', 'utf8');
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (!Array.isArray(data.progress)) data.progress = [];
  if (!Array.isArray(data.journal)) data.journal = [];
  if (!Array.isArray(data.reports)) data.reports = [];
  if (!Number.isInteger(data.nextJournalId) || data.nextJournalId < 1) data.nextJournalId = 1;
  if (!Number.isInteger(data.nextReportId) || data.nextReportId < 1) data.nextReportId = 1;
  return data;
}

// Write via a temp file + rename so a crash cannot leave a half-written file.
function saveData(data) {
  const tmp = DATA_FILE + '.tmp-' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

let db = loadData();

// ---------------------------------------------------------------------------
// Validation (server-side; mirrors the hosted app's action schemas)
// ---------------------------------------------------------------------------
const PROGRESS_KEY = /^(lab|lakera|plan)-([1-9]|10)$/;
const STATUSES = new Set(['not_started', 'in_progress', 'done']);
const REPORT_STATUSES = new Set(['draft', 'complete']);

function validProgressKey(key) {
  if (typeof key !== 'string' || !PROGRESS_KEY.test(key)) return false;
  const [prefix, num] = key.split('-');
  const n = Number(num);
  if (prefix === 'lab') return n >= 1 && n <= 7;
  if (prefix === 'lakera') return n >= 1 && n <= 10;
  if (prefix === 'plan') return n >= 1 && n <= 7;
  return false;
}

function isInt(v) { return Number.isInteger(v); }
function isStr(v) { return typeof v === 'string'; }
function optStr(v, max) {
  if (v === undefined || v === null) return '';
  if (!isStr(v) || v.length > max) return null;
  return v;
}
// Lakera score: must be a number; NaN rejected; rounded and clamped 0–100.
function normalizeScore(v) {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'number' || Number.isNaN(v)) return undefined;
  return Math.min(100, Math.max(0, Math.round(v)));
}

function bad(res, message) {
  sendJson(res, 400, { ok: false, error: message });
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function sendText(res, status, body, contentType) {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error('body too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(new Error('invalid JSON')); }
    });
    req.on('error', reject);
  });
}

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

function serveStatic(req, res, urlPath) {
  let rel = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath.slice(1));
  rel = path.normalize(rel).replace(/^(\.\.[\/\\])+/, '');
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return sendText(res, 404, 'Not found', 'text/plain; charset=utf-8');
  }
  const ext = path.extname(file);
  sendText(res, 200, fs.readFileSync(file), MIME[ext] || 'application/octet-stream');
}

// ---------------------------------------------------------------------------
// Report -> Markdown (used by the per-report export)
// ---------------------------------------------------------------------------
function reportToMarkdown(r) {
  const lines = [];
  lines.push('# ' + (r.title || 'Untitled report'));
  lines.push('');
  lines.push('Status: ' + (r.status || 'draft'));
  if (r.target_name) lines.push('Target: ' + r.target_name);
  if (r.target_url) lines.push('Target URL: ' + r.target_url);
  if (r.target_desc) lines.push('Target description: ' + r.target_desc);
  lines.push('');
  if (r.scope) { lines.push('## Scope'); lines.push(''); lines.push(r.scope); lines.push(''); }
  if (r.recon) { lines.push('## Recon'); lines.push(''); lines.push(r.recon); lines.push(''); }
  if (r.findings) { lines.push('## Findings'); lines.push(''); lines.push(r.findings); lines.push(''); }
  if (r.fixes) { lines.push('## Fixes / Defenses'); lines.push(''); lines.push(r.fixes); lines.push(''); }
  const tests = Array.isArray(r.tests) ? r.tests : [];
  if (tests.length) {
    lines.push('## Tests');
    lines.push('');
    tests.forEach((t) => lines.push('- ' + t));
    lines.push('');
  }
  lines.push('---');
  lines.push('AI Hacker Studio — authorized labs only (PortSwigger Academy / Lakera Gandalf).');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
function publicState() {
  return { progress: db.progress, journal: db.journal, reports: db.reports };
}

async function handleApi(req, res, url) {
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/state') {
    return sendJson(res, 200, { ok: true, ...publicState() });
  }

  if (req.method === 'GET' && pathname === '/api/export') {
    const body = JSON.stringify(publicState(), null, 2);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ai-hacker-studio-backup.json"',
    });
    return res.end(body);
  }

  const mdMatch = pathname.match(/^\/api\/report\/(\d+)\/markdown$/);
  if (req.method === 'GET' && mdMatch) {
    const id = Number(mdMatch[1]);
    const r = db.reports.find((x) => x.id === id);
    if (!r) return sendJson(res, 404, { ok: false, error: 'report not found' });
    res.writeHead(200, {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': 'attachment; filename="report-' + id + '.md"',
    });
    return res.end(reportToMarkdown(r));
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, error: 'method not allowed' });
  }

  let body;
  try { body = await readBody(req); }
  catch (e) { return bad(res, e.message); }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return bad(res, 'body must be a JSON object');
  }

  // --- set progress -------------------------------------------------------
  if (pathname === '/api/progress') {
    if (!validProgressKey(body.key)) return bad(res, 'invalid progress key (lab-1..7, lakera-1..10, plan-1..7)');
    if (!STATUSES.has(body.status)) return bad(res, 'invalid status');
    const score = normalizeScore(body.score);
    if (score === undefined) return bad(res, 'score must be a number 0-100 or null');
    const notes = optStr(body.notes, 4000);
    if (notes === null) return bad(res, 'notes must be a string up to 4000 characters');
    const now = new Date().toISOString();
    let entry = db.progress.find((p) => p.key === body.key);
    if (!entry) {
      entry = { key: body.key, status: body.status, score, notes, updated_at: now };
      db.progress.push(entry);
    } else {
      entry.status = body.status;
      entry.score = score;
      entry.notes = notes;
      entry.updated_at = now;
    }
    saveData(db);
    return sendJson(res, 200, { ok: true, entry });
  }

  // --- add journal entry --------------------------------------------------
  if (pathname === '/api/journal') {
    const title = body.title;
    if (!isStr(title) || title.length < 1 || title.length > 200) return bad(res, 'title is required (1-200 characters)');
    const fields = [
      ['prompt', 4000], ['result', 4000], ['intent', 120], ['technique', 120],
      ['evasion', 120], ['input_channel', 120], ['context_key', 64],
    ];
    const entry = { id: db.nextJournalId, title, created_at: new Date().toISOString() };
    for (const [name, max] of fields) {
      const v = optStr(body[name], max);
      if (v === null) return bad(res, name + ' must be a string up to ' + max + ' characters');
      entry[name] = v;
    }
    db.nextJournalId += 1;
    db.journal.push(entry);
    saveData(db);
    return sendJson(res, 200, { ok: true, id: entry.id, entry });
  }

  // --- delete journal entry ----------------------------------------------
  if (pathname === '/api/journal/delete') {
    if (!isInt(body.id)) return bad(res, 'id must be an integer');
    const idx = db.journal.findIndex((j) => j.id === body.id);
    if (idx === -1) return sendJson(res, 404, { ok: false, error: 'journal entry not found' });
    db.journal.splice(idx, 1);
    saveData(db);
    return sendJson(res, 200, { ok: true, deleted: body.id });
  }

  // --- create / update report --------------------------------------------
  if (pathname === '/api/report') {
    const title = body.title;
    if (!isStr(title) || title.length < 1 || title.length > 200) return bad(res, 'title is required (1-200 characters)');
    const fields = [
      ['target_name', 300], ['target_url', 500], ['target_desc', 2000],
      ['scope', 2000], ['recon', 4000], ['findings', 6000], ['fixes', 6000],
    ];
    const values = {};
    for (const [name, max] of fields) {
      const v = optStr(body[name], max);
      if (v === null) return bad(res, name + ' must be a string up to ' + max + ' characters');
      values[name] = v;
    }
    // tests: array of strings, or a JSON string of an array (as the hosted
    // app stores it). Normalised to an array.
    let tests = [];
    if (body.tests !== undefined && body.tests !== null) {
      if (Array.isArray(body.tests)) {
        tests = body.tests;
      } else if (isStr(body.tests)) {
        if (body.tests.length > 12000) return bad(res, 'tests must be up to 12000 characters');
        try { tests = JSON.parse(body.tests); } catch (e) { return bad(res, 'tests string must be a JSON array'); }
      } else {
        return bad(res, 'tests must be an array or a JSON string');
      }
      if (!Array.isArray(tests) || tests.some((t) => !isStr(t) || t.length > 500)) {
        return bad(res, 'tests must be an array of strings up to 500 characters each');
      }
    }
    const status = body.status === undefined ? 'draft' : body.status;
    if (!REPORT_STATUSES.has(status)) return bad(res, 'status must be draft or complete');
    const now = new Date().toISOString();
    if (body.id !== undefined && body.id !== null) {
      if (!isInt(body.id)) return bad(res, 'id must be an integer');
      const r = db.reports.find((x) => x.id === body.id);
      if (!r) return sendJson(res, 404, { ok: false, error: 'report not found' });
      Object.assign(r, values, { title, tests, status, updated_at: now });
      saveData(db);
      return sendJson(res, 200, { ok: true, id: r.id, report: r });
    }
    const report = { id: db.nextReportId, title, ...values, tests, status, created_at: now, updated_at: now };
    db.nextReportId += 1;
    db.reports.push(report);
    saveData(db);
    return sendJson(res, 200, { ok: true, id: report.id, report });
  }

  // --- delete report ------------------------------------------------------
  if (pathname === '/api/report/delete') {
    if (!isInt(body.id)) return bad(res, 'id must be an integer');
    const idx = db.reports.findIndex((r) => r.id === body.id);
    if (idx === -1) return sendJson(res, 404, { ok: false, error: 'report not found' });
    db.reports.splice(idx, 1);
    saveData(db);
    return sendJson(res, 200, { ok: true, deleted: body.id });
  }

  return sendJson(res, 404, { ok: false, error: 'unknown api route' });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/state' || url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch((e) => {
      sendJson(res, 500, { ok: false, error: 'internal error: ' + e.message });
    });
    return;
  }
  serveStatic(req, res, url.pathname);
});

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, () => {
  console.log('AI Hacker Studio listening on http://localhost:' + PORT);
});
