/* AI Hacker Studio — client.
 * Static curriculum content lives here; learner state (progress, journal,
 * reports) comes from /api/state and is saved through the JSON API.
 * No exploit payload strings anywhere: techniques and lessons are described
 * in general terms only, for authorized labs.
 */
'use strict';

// ---------------------------------------------------------------------------
// Static curriculum content
// ---------------------------------------------------------------------------
const KILL_CHAIN = [
  ['1. RECON', 'What inputs? Direct chat + indirect (reviews, docs, emails, RAG, memory).'],
  ['2. MAP TOOLS / APIs', 'What tools, data, permissions? Enumerate. Look for debug / delete / admin.'],
  ['3. INJECT', 'Direct or indirect injection to change its goal.'],
  ['4. AMPLIFY — Excessive Agency', 'Get it to call a privileged tool with attacker-controlled args. LLM01 + LLM06 is the killer combo.'],
  ['5. EXFIL / IMPACT', 'Leak, XSS, SSRF, SQLi, command injection, delete, poison memory.'],
  ['6. DEFEND / REPORT', 'Backend auth, least privilege, human approval, sanitize output, log tool calls.'],
];

const OWASP = [
  ['LLM01', 'Prompt Injection'],
  ['LLM02', 'Sensitive Information Disclosure'],
  ['LLM03', 'Supply Chain'],
  ['LLM04', 'Data and Model Poisoning'],
  ['LLM05', 'Improper Output Handling'],
  ['LLM06', 'Excessive Agency'],
  ['LLM07', 'System Prompt Leakage'],
  ['LLM08', 'Vector and Embedding Weaknesses'],
  ['LLM09', 'Misinformation'],
  ['LLM10', 'Unbounded Consumption'],
];

const DEFENSE_CHECKLIST = [
  'Treat LLM-accessible APIs as public — require auth, enforce per-user permissions in the backend.',
  'Least-privilege tools — the chatbot should not have delete/admin/debug tools at all.',
  'Human approval for high-impact actions (delete, transfer, email-forward, key reveal).',
  'Separate instruction vs data — system instructions in a privileged channel; tool/RAG content marked as data.',
  'Sanitize LLM output (encode, CSP) before rendering it or passing it to other systems.',
  'Do not feed the LLM data the lowest-privileged user should not see.',
  'Log LLM tool calls with user, prompt, tool and args — audit them like API logs.',
  'Test regularly with a prompt-injection test suite, not just one jailbreak.',
];

const PLAN_BLOCKS = [
  { key: 'plan-1', days: 'Days 1–3', text: 'PortSwigger Labs 1–2. Write a one-paragraph writeup per lab.' },
  { key: 'plan-2', days: 'Days 4–7', text: 'PortSwigger Labs 3–4. Focus: indirect injection + output handling.' },
  { key: 'plan-3', days: 'Days 8–11', text: 'PortSwigger Labs 5–7. Focus: agents and scanners.' },
  { key: 'plan-4', days: 'Days 12–18', text: 'Lakera: one app per day. Aim 75+. Keep a prompt journal.' },
  { key: 'plan-5', days: 'Days 19–23', text: 'Arcanum: classify 20 of your own prompts using the 4 axes.' },
  { key: 'plan-6', days: 'Days 24–27', text: 'Build your first full red-team report on a lab app using the template.' },
  { key: 'plan-7', days: 'Days 28–30', text: 'Review defenses. Re-test with fixes in mind. Update portfolio.' },
];

const LABS = [
  {
    key: 'lab-1', n: 1, title: 'Exploiting LLM APIs with Excessive Agency',
    level: 'Apprentice', owasp: 'LLM06 / LLM01',
    goal: 'Get the support chatbot to use its own privileged API.',
    mission: 'Step 2 Recon: ask the bot what APIs and functions it has access to, and what each one does.',
    steps: [
      'Ask the bot: what APIs do you have access to? List each one with what it does and what arguments it needs.',
      'Ask for more detail on the debug/admin API — what it does, what it accepts.',
      'Ask it to use that tool for a legitimate-sounding support task.',
    ],
    lesson: 'Treat any API the LLM can call as PUBLIC. Enforce auth in the backend, not in the prompt. Require confirmation before destructive calls.',
    defense: 'Backend auth. No delete tool for the chatbot. Human approval.',
  },
  {
    key: 'lab-2', n: 2, title: 'Exploiting Vulnerabilities in LLM APIs',
    level: 'Practitioner', owasp: 'LLM06 + classic web vulns',
    goal: 'Use the LLM to send classic web attacks through an API that is itself vulnerable.',
    mission: 'Map the API behind the bot: what does it accept, and what does it do with the input?',
    steps: [
      'Enumerate the tools the LLM can call and what each one does.',
      'Probe what the downstream API accepts — does it validate its inputs?',
      'Route a classic web attack through the LLM so the API executes it.',
    ],
    lesson: 'Downstream APIs must validate and sanitize all inputs, even when they come from the LLM.',
    defense: 'Validate and sanitize at the API layer. The LLM is not a trusted caller.',
  },
  {
    key: 'lab-3', n: 3, title: 'Indirect Prompt Injection',
    level: 'Practitioner', owasp: 'LLM01 indirect',
    goal: 'Plant an instruction in content the chatbot will read later.',
    mission: 'Find what content the chatbot reads (reviews, docs) and how it treats that content.',
    steps: [
      'Find content the chatbot ingests — product reviews, documents, knowledge base.',
      'Place an instruction inside that content.',
      'Trigger it with a normal question from the victim side.',
    ],
    lesson: 'Treat ingested content as UNTRUSTED DATA, never instructions. Separate system/developer/user/tool data.',
    defense: 'Mark tool and RAG content as data. Watch for fake system markup and fake user turns.',
  },
  {
    key: 'lab-4', n: 4, title: 'Exploiting Insecure Output Handling',
    level: 'Expert', owasp: 'LLM05 + XSS',
    goal: 'Get the app to render LLM output unsanitized into the page.',
    mission: 'Check how the app renders the bot’s output — is it encoded, or raw?',
    steps: [
      'Check how the app displays the LLM’s answer in the page.',
      'Get the LLM to output a harmless marker first and see how it renders.',
      'Show the marker reaches the browser unsanitized.',
    ],
    lesson: 'Sanitize LLM output like any untrusted input. Encode on output, CSP, never innerHTML LLM text.',
    defense: 'Encode LLM output. Content Security Policy. Treat model output as untrusted.',
  },
  {
    key: 'lab-5', n: 5, title: 'Exploiting AI Agents to Trigger Secondary Vulnerabilities',
    level: 'Practitioner', owasp: 'LLM01 + SSRF',
    goal: 'Make an authenticated agent trigger a secondary vulnerability.',
    mission: 'Watch what the agent does with content it crawls while authenticated.',
    steps: [
      'Find what the agent crawls and what identity it acts with.',
      'Plant an instruction in content the agent will read.',
      'Show the agent acting on it — fetching or triggering something it should not.',
    ],
    lesson: 'Agents are users — least privilege, scoped crawl, do not act on instructions found in crawled content.',
    defense: 'Least-privilege agent identity. Allowlisted fetch targets. Never act on crawled instructions.',
  },
  {
    key: 'lab-6', n: 6, title: 'Exploiting AI Agents to Perform Destructive Actions',
    level: 'Apprentice', owasp: 'LLM01 + CSRF / destructive',
    goal: 'Show a scanner acting destructively on what it reads.',
    mission: 'Check whether the scanner acts on what it reads in comments and reports.',
    steps: [
      'Find where the scanner reads user-supplied content (comments, reports).',
      'Place a fake finding in that content.',
      'Show the scanner performing a state-changing action on it.',
    ],
    lesson: 'A scanner must NEVER perform state-changing actions on content it reads. Read-only mode, no auto-exploit.',
    defense: 'Scanners are read-only. No destructive actions from crawled content, ever.',
  },
  {
    key: 'lab-7', n: 7, title: 'Bypassing AI Scanner Defenses to Exfiltrate Sensitive Info',
    level: 'Practitioner / Expert', owasp: 'LLM01 + LLM02 + LLM07',
    goal: 'Get a defended scanner to publish a real secret value.',
    mission: 'Probe the scanner’s defenses: what does it refuse to output, and why?',
    steps: [
      'Map the scanner’s defenses: what it flags, what it generalizes, what it never outputs.',
      'Reframe the request as legitimate verification.',
      'Show the real value reaching the output.',
    ],
    lesson: 'Prompt-only defenses fail. Data minimization — the scanner should not have secrets at all. Redact in the output layer, not the prompt.',
    defense: 'Do not give the scanner secrets. Redact at the output layer, not in the prompt.',
  },
];

const LAKERA = [
  { key: 'lakera-1', n: 1, title: 'Thingularity', tag: 'Tool Enumeration', desc: 'Get the app to reveal all its available tools. Recon phase — this unlocks every later attack.' },
  { key: 'lakera-2', n: 2, title: 'MindfulChat', tag: 'Memory Poisoning', desc: 'Poison the agent’s long-term memory so later victims get wrong answers. Teaches persistence across sessions and users.' },
  { key: 'lakera-3', n: 3, title: 'System Prompt Exfiltration', tag: 'Prompt Leakage', desc: 'Get the agent to reveal its system prompt or instructions. Reframe as debugging, summarizing, translating, encoding.' },
  { key: 'lakera-4', n: 4, title: 'Phishing / Malicious Link Insertion', tag: 'Social Engineering', desc: 'Get the agent to insert an attacker link into its answer to a victim. Users trust agent output.' },
  { key: 'lakera-5', n: 5, title: 'Unauthorized Tool Call', tag: 'Excessive Agency', desc: 'Get the agent to call a tool it should not for this user. Teaches the LLM06 tool + permission mismatch.' },
  { key: 'lakera-6', n: 6, title: 'Malicious Code / Command', tag: 'Command Execution', desc: 'Get the agent to output or run code or a command. Teaches chaining the LLM to downstream execution.' },
  { key: 'lakera-7', n: 7, title: 'Data Exfiltration', tag: 'Exfiltration', desc: 'Get the agent to encode a secret into a URL, output or message the attacker can read. Teaches exfil channel thinking.' },
  { key: 'lakera-8', n: 8, title: 'DoS / Resource Abuse', tag: 'Unbounded Consumption', desc: 'Get the agent to loop, repeat, or consume resources. Teaches LLM10 Unbounded Consumption.' },
  { key: 'lakera-9', n: 9, title: 'Multi-Step Agent', tag: 'Kill Chain', desc: 'Chain it: enumerate, inject, tool call, exfil in one conversation. Teaches the full kill chain.' },
  { key: 'lakera-10', n: 10, title: 'Expert / Combined', tag: 'Combined', desc: 'Hardest: defenses + multiple tools + memory + guardrails. Requires evasion, patience and iterative probing.' },
];

const PHASE2 = [
  'Recon first, not attack.',
  'Try the simplest direct prompt first.',
  'If blocked, change framing (debugging, audit, roleplay, translation, encoding).',
  'Split the attack across turns (tool list, then args, then use it).',
  'For memory apps, think long-term: what will the agent remember and repeat to the NEXT user?',
];

// axis: intent | technique | evasion | input
const TECHNIQUES = [
  ['Direct Injection', 'technique', 'Ask directly to ignore instructions / do a forbidden task.'],
  ['Indirect Injection', 'technique', 'Plant instruction in review, doc, email or memory.'],
  ['Fake System Message', 'technique', 'Important system message hidden in ingested content.'],
  ['Fake User Turn', 'technique', 'Fake user turn hidden in ingested content.'],
  ['Tool Enumeration', 'technique', 'Ask what APIs, tools or functions it has.'],
  ['Debug / API Abuse', 'technique', 'Get the LLM to call a debug or admin tool.'],
  ['Memory Poisoning', 'technique', 'Poison stored memory for future victims.'],
  ['System Prompt Elicitation', 'technique', 'Ask to repeat, summarize or translate instructions.'],
  ['Encoding Evasion', 'evasion', 'Base64 / Hex / ROT13 to hide a payload.'],
  ['Translation Evasion', 'evasion', 'Ask in another language.'],
  ['Splitting Across Turns', 'evasion', 'Split the attack across multiple turns.'],
  ['Roleplay Framing', 'evasion', 'Pretend to be a developer or auditor.'],
  ['Audit Framing', 'evasion', 'Frame exfiltration as legitimate verification.'],
  ['Output XSS', 'technique', 'Get the LLM to output a script the app renders.'],
  ['SSRF via Agent', 'technique', 'Agent fetches an internal URL.'],
  ['CSRF via Agent', 'technique', 'Agent performs a state-changing action.'],
  ['Tool Chaining', 'technique', 'Chain tool calls to reach a secondary vulnerability.'],
  ['RAG Poisoning', 'input', 'Poison retrieved documents.'],
  ['Training Data Elicitation', 'technique', 'Complete the sentence / remind me…'],
  ['Guardrail Bypass', 'evasion', 'Make a forbidden request look like a normal job.'],
  ['Delimiter Confusion', 'technique', 'Confuse where instruction ends and data begins.'],
  ['Role Confusion', 'technique', 'Confuse system vs user vs tool roles.'],
  ['Multi-Turn Escalation', 'technique', 'Gradually escalate over a conversation.'],
  ['Data Exfil Channel', 'input', 'Encode a secret into a URL, output or message.'],
];
const TECH_DEFENSE = 'Defense: backend auth, least privilege, separate instruction vs data, sanitize output.';

const SITUATIONS = [
  {
    title: 'The bot lists a debug or admin tool',
    read: 'Check what the tool does, what arguments it takes, and whose permissions it runs with.',
    moves: 'Ask for the argument details first, then try a low-impact call framed as a support task.',
    defense: 'Remove delete/admin/debug tools from the chatbot entirely; enforce backend auth per user.',
  },
  {
    title: 'The direct ask gets refused',
    read: 'Note the exact refusal wording — the guardrail is prompt-level, not enforced in code.',
    moves: 'Reframe the request (audit, debugging, translation, encoding) or split it across turns.',
    defense: 'Enforce the rule in the backend, not the prompt — and log refusals.',
  },
  {
    title: 'A review or document the bot will read',
    read: 'Map what content the bot ingests: reviews, docs, knowledge base, RAG sources.',
    moves: 'Place an instruction inside that content, then trigger it with a normal question.',
    defense: 'Mark ingested content as data, never instructions; keep instruction and data in separate channels.',
  },
  {
    title: 'The app renders the bot’s answer in the page',
    read: 'Check whether model output reaches the DOM encoded or raw.',
    moves: 'Get the bot to output a harmless marker first and watch how it renders.',
    defense: 'Encode output, use a Content Security Policy, never innerHTML model text.',
  },
  {
    title: 'An agent is asked to fetch or open a URL',
    read: 'Check what identity the agent acts with and whether it can reach internal addresses.',
    moves: 'Point it at a URL that triggers a secondary action and watch what it does.',
    defense: 'Agents are users: least privilege, allowlisted fetch targets, no credentials on crawls.',
  },
  {
    title: 'A scanner report asks for action',
    read: 'Is the report content, or an instruction? Does the scanner act on what it reads?',
    moves: 'Check whether the scanner performs any state-changing action from crawled content.',
    defense: 'Scanners are read-only. No destructive actions from crawled content, ever.',
  },
  {
    title: 'The bot remembers things across users',
    read: 'Does it have long-term memory? What persists, and who can write to it?',
    moves: 'Seed a false fact and see whether it repeats to the next user.',
    defense: 'Memory writes need provenance and approval; scope memory per user.',
  },
  {
    title: 'The scanner will not reveal the value',
    read: 'What does it flag, generalize, or refuse? Map the defense before attacking it.',
    moves: 'Frame the request as legitimate verification; ask for a summary or an encoding.',
    defense: 'Data minimization — the scanner should not hold secrets; redact in the output layer.',
  },
];

const FIXES = {
  auth: 'Enforce auth + per-user permissions in the backend API, not in the prompt.',
  least: 'Remove delete/admin/debug tools from the chatbot entirely.',
  approval: 'Require human approval before delete, transfer or key reveal.',
  sanitize: 'Encode LLM output, use a CSP, never innerHTML LLM text.',
};

const SCOPE_PREFILL = 'Authorized labs only (PortSwigger Academy / Lakera Gandalf). Out of scope: production systems, real users, real secrets. Written authorization required for anything beyond the lab.';

// ---------------------------------------------------------------------------
// State + API
// ---------------------------------------------------------------------------
let state = { progress: [], journal: [], reports: [] };
const progressByKey = () => {
  const m = {};
  state.progress.forEach((p) => { m[p.key] = p; });
  return m;
};

async function api(path, method, body) {
  const res = await fetch(path, {
    method: method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('Request failed: ' + res.status));
  return data;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Two-step confirm: first click arms the button for 4s, second click acts.
function armConfirm(btn, action) {
  if (btn.dataset.armed === '1') {
    clearTimeout(btn._timer);
    delete btn.dataset.armed;
    btn.textContent = btn.dataset.label;
    action();
    return;
  }
  btn.dataset.label = btn.textContent;
  btn.dataset.armed = '1';
  btn.textContent = 'Click again to confirm';
  btn._timer = setTimeout(() => {
    delete btn.dataset.armed;
    btn.textContent = btn.dataset.label;
  }, 4000);
}

// ---------------------------------------------------------------------------
// Tabs (roving tabindex, arrow keys)
// ---------------------------------------------------------------------------
const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
function selectTab(tab, focus) {
  tabs.forEach((t) => {
    const selected = t === tab;
    t.classList.toggle('active', selected);
    t.setAttribute('aria-selected', selected ? 'true' : 'false');
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => selectTab(tab, false));
  tab.addEventListener('keydown', (e) => {
    let next = null;
    if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
    if (e.key === 'Home') next = tabs[0];
    if (e.key === 'End') next = tabs[tabs.length - 1];
    if (next) { e.preventDefault(); selectTab(next, true); }
  });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function statusLabel(s) {
  return s === 'done' ? 'Done' : s === 'in_progress' ? 'In progress' : 'Not started';
}

function progressForm(key, current, withScore) {
  const st = current ? current.status : 'not_started';
  const score = current && current.score != null ? current.score : '';
  const notes = current ? (current.notes || '') : '';
  return '<div class="progrow" data-key="' + esc(key) + '">'
    + '<label>Status <select class="pstatus">'
    + ['not_started', 'in_progress', 'done'].map((v) =>
      '<option value="' + v + '"' + (v === st ? ' selected' : '') + '>' + statusLabel(v) + '</option>').join('')
    + '</select></label>'
    + (withScore
      ? '<label>Score (0–100) <input type="number" class="pscore" min="0" max="100" step="1" value="' + esc(score) + '" placeholder="—"></label>'
      : '')
    + '<label>Notes <textarea class="pnotes" rows="2" maxlength="4000" placeholder="Writeup notes…">' + esc(notes) + '</textarea></label>'
    + '<button class="psave">Save</button> <span class="psaved ok"></span>'
    + '</div>';
}

function bindProgressForms(container) {
  container.querySelectorAll('.progrow').forEach((row) => {
    row.querySelector('.psave').addEventListener('click', async () => {
      const key = row.dataset.key;
      const status = row.querySelector('.pstatus').value;
      const scoreEl = row.querySelector('.pscore');
      const notes = row.querySelector('.pnotes').value;
      const payload = { key, status, notes };
      if (scoreEl) {
        const raw = scoreEl.value.trim();
        payload.score = raw === '' ? null : Number(raw);
      }
      const saved = row.querySelector('.psaved');
      try {
        await api('/api/progress', 'POST', payload);
        saved.textContent = 'Saved';
        await refresh();
      } catch (e) {
        saved.textContent = '';
        alert('Could not save: ' + e.message);
      }
    });
  });
}

function renderMission() {
  const byKey = progressByKey();
  const done = (k) => byKey[k] && byKey[k].status === 'done';
  let mission = '';
  const lab = LABS.find((l) => !done(l.key));
  if (lab) {
    mission = '<b>Lab ' + lab.n + ': ' + esc(lab.title) + '</b><br>' + esc(lab.mission);
  } else {
    const app = LAKERA.find((a) => !done(a.key));
    if (app) {
      mission = '<b>Lakera: ' + esc(app.title) + ' — ' + esc(app.tag) + '</b><br>Aim for a score of 75+. ' + esc(app.desc);
    } else {
      const block = PLAN_BLOCKS.find((b) => !done(b.key));
      if (block) {
        mission = '<b>' + esc(block.days) + '</b><br>' + esc(block.text);
      } else {
        mission = '<b>All curriculum complete.</b><br>Publish your portfolio: three sanitized writeups (Lab 3, Lab 4, MindfulChat) — stronger than a certificate.';
      }
    }
  }
  document.getElementById('mission').innerHTML = mission;
  const labsDone = LABS.filter((l) => done(l.key)).length;
  const plansDone = PLAN_BLOCKS.filter((b) => done(b.key)).length;
  const level = labsDone === 7 && plansDone === 7 ? 'Executive'
    : labsDone === 7 ? 'Pro'
    : labsDone >= 3 ? 'Master' : 'Beginner';
  const passed = LAKERA.filter((a) => done(a.key) && byKey[a.key].score != null && byKey[a.key].score >= 75).length;
  document.getElementById('levelLine').textContent =
    'Level: ' + level + ' — ' + labsDone + '/7 labs done, ' + passed + '/10 Lakera apps passed (75+), ' + plansDone + '/7 plan blocks done.';
}

function renderStatic() {
  document.getElementById('killchain').innerHTML = KILL_CHAIN.map(([t, d]) =>
    '<details><summary>' + esc(t) + '</summary><p class="small">' + esc(d) + '</p></details>').join('');
  document.getElementById('owasp').innerHTML = '<p class="small">' + OWASP.map(([id, name]) =>
    esc(id) + ' ' + esc(name)).join(' — ') + '</p>';
  document.getElementById('defenseList').innerHTML = '<ul>' + DEFENSE_CHECKLIST.map((d) =>
    '<li class="small">' + esc(d) + '</li>').join('') + '</ul>';
  document.getElementById('phase2').innerHTML = PHASE2.map((s) =>
    '<li class="small">' + esc(s) + '</li>').join('');
  document.getElementById('planList').innerHTML = PLAN_BLOCKS.map((b) =>
    '<details><summary><b>' + esc(b.days) + '</b> — ' + esc(b.text) + '</summary>'
    + '<div data-plan="' + esc(b.key) + '"></div></details>').join('');
}

function renderLabs() {
  const byKey = progressByKey();
  const list = document.getElementById('labList');
  list.innerHTML = LABS.map((lab) => {
    const cur = byKey[lab.key];
    const badge = cur && cur.status === 'done' ? ' <span class="badge b">DONE</span>'
      : cur && cur.status === 'in_progress' ? ' <span class="badge m">IN PROGRESS</span>' : '';
    return '<div class="card inner"><h3>Lab ' + lab.n + ' — ' + esc(lab.title) + badge + '</h3>'
      + '<p class="small">' + esc(lab.level) + ' · ' + esc(lab.owasp) + '</p>'
      + '<p><b>Goal:</b> ' + esc(lab.goal) + '</p>'
      + '<ol>' + lab.steps.map((s) => '<li class="small">' + esc(s) + '</li>').join('') + '</ol>'
      + '<p class="small"><b>Lesson:</b> ' + esc(lab.lesson) + '</p>'
      + '<p class="small"><b>Defense:</b> ' + esc(lab.defense) + '</p>'
      + progressForm(lab.key, cur, false)
      + '</div>';
  }).join('');
  const done = LABS.filter((l) => byKey[l.key] && byKey[l.key].status === 'done').length;
  document.getElementById('labProg').textContent = done + '/7 labs done';
  bindProgressForms(list);
  // Plan blocks live on the Overview tab; render their forms too.
  document.querySelectorAll('[data-plan]').forEach((slot) => {
    const key = slot.dataset.plan;
    slot.innerHTML = progressForm(key, byKey[key], false);
    bindProgressForms(slot);
  });
}

function renderLakera() {
  const byKey = progressByKey();
  const list = document.getElementById('lakList');
  list.innerHTML = LAKERA.map((app) => {
    const cur = byKey[app.key];
    const passed = cur && cur.status === 'done' && cur.score != null && cur.score >= 75;
    const badge = passed ? ' <span class="badge b">PASSED ' + esc(cur.score) + '</span>'
      : cur && cur.status === 'done' ? ' <span class="badge m">DONE — score ' + esc(cur.score == null ? '—' : cur.score) + '</span>'
      : cur && cur.status === 'in_progress' ? ' <span class="badge m">IN PROGRESS</span>' : '';
    return '<div class="card inner"><h3>' + app.n + '. ' + esc(app.title) + ' — ' + esc(app.tag) + badge + '</h3>'
      + '<p class="small">' + esc(app.desc) + '</p>'
      + progressForm(app.key, cur, true)
      + '</div>';
  }).join('');
  const passed = LAKERA.filter((a) => {
    const c = byKey[a.key];
    return c && c.status === 'done' && c.score != null && c.score >= 75;
  }).length;
  document.getElementById('lakProg').textContent = passed + '/10 apps passed (75+)';
  bindProgressForms(list);
}

function renderTech(filter) {
  const q = (filter || '').toLowerCase();
  const list = document.getElementById('techList');
  const rows = TECHNIQUES.filter(([name, axis, desc]) =>
    !q || name.toLowerCase().includes(q) || axis.includes(q) || desc.toLowerCase().includes(q));
  list.innerHTML = rows.length ? rows.map(([name, axis, desc]) =>
    '<details><summary>' + esc(name) + ' <span class="axistag">' + esc(axis) + '</span></summary>'
    + '<p class="small">' + esc(desc) + '<br><b>' + esc(TECH_DEFENSE) + '</b></p></details>').join('')
    : '<p class="small">No techniques match that search.</p>';
}

function renderDecide() {
  document.getElementById('situationList').innerHTML = SITUATIONS.map((s, i) =>
    '<details><summary>' + (i + 1) + '. ' + esc(s.title) + '</summary>'
    + '<p class="small"><b>Read:</b> ' + esc(s.read) + '</p>'
    + '<p class="small"><b>Moves:</b> ' + esc(s.moves) + '</p>'
    + '<p class="small"><b>Defense:</b> ' + esc(s.defense) + '</p></details>').join('');
}

function renderJournal() {
  const list = document.getElementById('journalList');
  if (!state.journal.length) {
    list.innerHTML = '<p class="small">No entries yet.</p>';
    return;
  }
  list.innerHTML = state.journal.map((j) => {
    const tags = [j.intent, j.technique, j.evasion, j.input_channel].filter(Boolean).map(esc).join(' · ');
    return '<div class="card inner"><h3>' + esc(j.title) + '</h3>'
      + (tags ? '<p class="small">' + tags + '</p>' : '')
      + (j.context_key ? '<p class="small">Context: ' + esc(j.context_key) + '</p>' : '')
      + (j.prompt ? '<p class="small"><b>Prompt:</b> ' + esc(j.prompt) + '</p>' : '')
      + (j.result ? '<p class="small"><b>Result:</b> ' + esc(j.result) + '</p>' : '')
      + '<button class="jdel" data-id="' + j.id + '">Delete entry</button>'
      + '</div>';
  }).join('');
  list.querySelectorAll('.jdel').forEach((btn) => {
    btn.addEventListener('click', () => {
      armConfirm(btn, async () => {
        try { await api('/api/journal/delete', 'POST', { id: Number(btn.dataset.id) }); await refresh(); }
        catch (e) { alert('Could not delete: ' + e.message); }
      });
    });
  });
}

function renderReports() {
  const list = document.getElementById('reportList');
  if (!state.reports.length) {
    list.innerHTML = '<p class="small">No reports yet.</p>';
    return;
  }
  list.innerHTML = state.reports.map((r) =>
    '<div class="card inner"><h3>' + esc(r.title) + ' <span class="badge ' + (r.status === 'complete' ? 'b' : 'm') + '">' + esc(r.status) + '</span></h3>'
    + (r.target_name ? '<p class="small">Target: ' + esc(r.target_name) + '</p>' : '')
    + '<button class="redit" data-id="' + r.id + '">Edit</button> '
    + '<a class="btnlink small" href="/api/report/' + r.id + '/markdown" download>Export Markdown</a> '
    + '<button class="rdel" data-id="' + r.id + '">Delete report</button>'
    + '</div>').join('');
  list.querySelectorAll('.redit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const r = state.reports.find((x) => x.id === Number(btn.dataset.id));
      if (!r) return;
      const f = document.getElementById('reportForm');
      f.id.value = r.id;
      f.title.value = r.title || '';
      f.target_name.value = r.target_name || '';
      f.target_url.value = r.target_url || '';
      f.target_desc.value = r.target_desc || '';
      f.scope.value = r.scope || '';
      f.recon.value = r.recon || '';
      f.findings.value = r.findings || '';
      f.fixes.value = r.fixes || '';
      f.tests.value = (r.tests || []).join('\n');
      f.status.value = r.status || 'draft';
      f.scrollIntoView();
    });
  });
  list.querySelectorAll('.rdel').forEach((btn) => {
    btn.addEventListener('click', () => {
      armConfirm(btn, async () => {
        try { await api('/api/report/delete', 'POST', { id: Number(btn.dataset.id) }); await refresh(); }
        catch (e) { alert('Could not delete: ' + e.message); }
      });
    });
  });
}

function renderAll() {
  renderMission();
  renderLabs();
  renderLakera();
  renderTech(document.getElementById('techSearch').value);
  renderDecide();
  renderJournal();
  renderReports();
}

async function refresh() {
  const data = await api('/api/state');
  state = { progress: data.progress || [], journal: data.journal || [], reports: data.reports || [] };
  renderAll();
}

// ---------------------------------------------------------------------------
// Forms
// ---------------------------------------------------------------------------
document.getElementById('techSearch').addEventListener('input', (e) => renderTech(e.target.value));

document.querySelectorAll('[data-fix]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById('fixOut').textContent = FIXES[btn.dataset.fix];
  });
});

document.getElementById('journalForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const payload = {};
  ['title', 'prompt', 'result', 'intent', 'technique', 'evasion', 'input_channel', 'context_key']
    .forEach((n) => { payload[n] = f[n].value.trim(); });
  try {
    await api('/api/journal', 'POST', payload);
    f.reset();
    await refresh();
  } catch (err) { alert('Could not save entry: ' + err.message); }
});

const reportForm = document.getElementById('reportForm');
if (!reportForm.scope.value) reportForm.scope.value = SCOPE_PREFILL;
reportForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = e.target;
  const payload = {
    title: f.title.value.trim(),
    target_name: f.target_name.value.trim(),
    target_url: f.target_url.value.trim(),
    target_desc: f.target_desc.value.trim(),
    scope: f.scope.value.trim(),
    recon: f.recon.value.trim(),
    findings: f.findings.value.trim(),
    fixes: f.fixes.value.trim(),
    tests: f.tests.value.split('\n').map((t) => t.trim()).filter(Boolean),
    status: f.status.value,
  };
  if (f.id.value) payload.id = Number(f.id.value);
  try {
    await api('/api/report', 'POST', payload);
    f.reset();
    f.id.value = '';
    f.scope.value = SCOPE_PREFILL;
    await refresh();
  } catch (err) { alert('Could not save report: ' + err.message); }
});
document.getElementById('reportClear').addEventListener('click', () => {
  reportForm.reset();
  reportForm.id.value = '';
  reportForm.scope.value = SCOPE_PREFILL;
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
renderStatic();
refresh().catch((e) => {
  document.getElementById('mission').textContent = 'Could not load saved state: ' + e.message;
});
