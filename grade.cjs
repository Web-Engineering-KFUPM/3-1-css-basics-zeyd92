#!/usr/bin/env node
/**
 * Lab CSS Basics — Autograder (grade.cjs)
 *
 * Scoring:
 * - TODO 1..9 (9 TODOs): weighted inside an 80-mark bucket
 *   - Each TODO weight: 12
 *   - TODO 2 and TODO 6 weight: 14
 *   - NOTE: weights are normalized to 80 marks total for TODOs
 * - Submission: 20 marks (on-time=20, late=10, missing/empty CSS=0)
 *
 * IMPORTANT (late check):
 * - We grade lateness using the latest *student* commit (non-bot),
 *   NOT the latest workflow/GitHub Actions commit.
 *
 * Status codes:
 * - 0 = on time
 * - 1 = late
 * - 2 = no submission OR empty CSS file
 *
 * Outputs:
 * - artifacts/grade.csv  (structure unchanged)
 * - artifacts/feedback/README.md
 * - GitHub Actions Step Summary (GITHUB_STEP_SUMMARY)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const LAB_NAME = "3-1-css-basics";

const ARTIFACTS_DIR = "artifacts";
const FEEDBACK_DIR = path.join(ARTIFACTS_DIR, "feedback");
fs.mkdirSync(FEEDBACK_DIR, { recursive: true });
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

/** Due date (keep/update as needed). Riyadh time (UTC+03:00) */
const DUE_ISO = "2025-09-15T23:59:00+03:00";
const DUE_EPOCH_MS = Date.parse(DUE_ISO);

const TODO_BUCKET_MAX = 80; // normalized bucket for TODOs
const SUBMISSION_MAX = 20;
const TOTAL_MAX = 100;

const CSS_FILE_DEFAULT = "styles.css";

/** ---------- Student ID ---------- */
function getStudentId() {
  const repoFull = process.env.GITHUB_REPOSITORY || ""; // org/repo
  const repoName = repoFull.includes("/") ? repoFull.split("/")[1] : repoFull;

  const fromRepoSuffix =
    repoName && repoName.includes("-") ? repoName.split("-").slice(-1)[0] : "";

  return (
    process.env.STUDENT_USERNAME ||
    fromRepoSuffix ||
    process.env.GITHUB_ACTOR ||
    repoName ||
    "student"
  );
}

/** ---------- Git helpers: latest *student* commit time (exclude bots/workflows) ---------- */
function getLatestStudentCommitEpochMs() {
  try {
    const out = execSync('git log --format=%ct|%an|%ae|%cn|%ce|%s -n 300', {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();

    if (!out) return null;

    const lines = out.split("\n");
    for (const line of lines) {
      const parts = line.split("|");
      const ct = parts[0];
      const an = parts[1] || "";
      const ae = parts[2] || "";
      const cn = parts[3] || "";
      const ce = parts[4] || "";
      const subject = parts.slice(5).join("|") || "";

      const hay = `${an} ${ae} ${cn} ${ce} ${subject}`.toLowerCase();

      const isBot =
        hay.includes("[bot]") ||
        hay.includes("github-actions") ||
        hay.includes("actions@github.com") ||
        hay.includes("github classroom") ||
        hay.includes("classroom[bot]") ||
        hay.includes("dependabot") ||
        hay.includes("autograding") ||
        hay.includes("workflow");

      if (isBot) continue;

      const seconds = Number(ct);
      if (!Number.isFinite(seconds)) continue;
      return seconds * 1000;
    }

    // Fallback: latest commit time
    const fallback = execSync("git log -1 --format=%ct", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    const seconds = Number(fallback);
    return Number.isFinite(seconds) ? seconds * 1000 : null;
  } catch {
    return null;
  }
}

function wasSubmittedLate() {
  const commitMs = getLatestStudentCommitEpochMs();
  if (!commitMs) return false; // best-effort
  return commitMs > DUE_EPOCH_MS;
}

/** ---------- File helpers ---------- */
function readTextSafe(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

/** ---------- HTML helpers (to discover linked CSS) ---------- */
function stripHtmlComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, "");
}

function findCssHrefs(html) {
  const h = stripHtmlComments(html);
  // <link rel="stylesheet" href="...">
  const re = /<link\b[^>]*\brel\s*=\s*["']stylesheet["'][^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const hrefs = [];
  let m;
  while ((m = re.exec(h)) !== null) hrefs.push(m[1]);
  return hrefs;
}

function resolveFromIndex(ref, indexPath) {
  const base = path.dirname(indexPath);
  if (/^https?:\/\//i.test(ref)) return null;
  const cleaned = ref.replace(/^\//, ""); // treat "/x.css" as repo-relative
  return path.normalize(path.join(base, cleaned));
}

function guessCssFileFromRepo() {
  const candidates = [CSS_FILE_DEFAULT, "style.css", "main.css", "app.css", "index.css"];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  const entries = fs.readdirSync(".", { withFileTypes: true });
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!e.name.toLowerCase().endsWith(".css")) continue;
    if (e.name.toLowerCase().includes("node_modules")) continue;
    if (e.name.toLowerCase().includes("artifacts")) continue;
    return e.name;
  }
  return null;
}

/** ---------- CSS parsing helpers (robust-enough for autograding) ---------- */
function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}
function compactWs(s) {
  return s.replace(/\s+/g, " ").trim();
}
function isEmptyCss(css) {
  const stripped = compactWs(stripCssComments(css));
  return stripped.length < 10;
}

function normalizeSelector(s) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeDecls(s) {
  // keep punctuation, but normalize spacing/case for reliable checks
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseCssRules(cssText) {
  // best-effort: find "selector { decls }" blocks
  const css = stripCssComments(cssText);
  const rules = [];
  const re = /([^{}]+)\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    const selectorRaw = m[1];
    const declRaw = m[2];
    const selectorList = selectorRaw
      .split(",")
      .map((x) => normalizeSelector(x))
      .filter(Boolean);
    const decls = normalizeDecls(declRaw);
    for (const sel of selectorList) {
      rules.push({ selector: sel, decls });
    }
  }
  return rules;
}

function declsHasAnyProperty(decls, propNames) {
  return propNames.some((p) => new RegExp(`\\b${escapeRegExp(p)}\\s*:`, "i").test(decls));
}

function declsHasAllProperties(decls, propNames) {
  return propNames.every((p) => new RegExp(`\\b${escapeRegExp(p)}\\s*:`, "i").test(decls));
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findMatchingRules(rules, selectorMatcher) {
  // selectorMatcher: string | RegExp | function
  if (typeof selectorMatcher === "string") {
    const target = normalizeSelector(selectorMatcher);
    return rules.filter((r) => r.selector === target);
  }
  if (selectorMatcher instanceof RegExp) {
    return rules.filter((r) => selectorMatcher.test(r.selector));
  }
  if (typeof selectorMatcher === "function") {
    return rules.filter((r) => selectorMatcher(r.selector));
  }
  return [];
}

function ruleSatisfies(rules, selectorMatcher, { anyProps = [], allProps = [], mustInclude = [] } = {}) {
  const matches = findMatchingRules(rules, selectorMatcher);
  if (matches.length === 0) return false;

  return matches.some((r) => {
    const d = r.decls;

    const okAll = allProps.length ? declsHasAllProperties(d, allProps) : true;
    const okAny = anyProps.length ? declsHasAnyProperty(d, anyProps) : true;
    const okInclude = mustInclude.length
      ? mustInclude.every((needle) => d.includes(String(needle).toLowerCase()))
      : true;

    return okAll && okAny && okInclude;
  });
}

/** Treat related CSS properties as acceptable alternatives (don’t check values) */
const RELATED = {
  color: ["color"],
  fontSize: ["font-size", "font"], // allow shorthand
  fontFamily: ["font-family", "font"],
  fontWeight: ["font-weight", "font"],
  background: ["background-color", "background"],
  padding: ["padding", "padding-top", "padding-right", "padding-bottom", "padding-left"],
  textDecoration: ["text-decoration", "text-decoration-line", "text-decoration-style", "text-decoration-thickness"],
  boxSizing: ["box-sizing"],
};

/** ---------- Requirement scoring ---------- */
function req(label, ok, detailIfFail = "") {
  return { label, ok: !!ok, detailIfFail };
}

function scoreFromRequirements(reqs) {
  const total = reqs.length;
  const ok = reqs.filter((r) => r.ok).length;
  if (total === 0) return { ok: 0, total: 0, fraction: 0 };
  return { ok, total, fraction: ok / total };
}

function formatReqs(reqs) {
  const lines = [];
  for (const r of reqs) {
    if (r.ok) lines.push(`- ✅ ${r.label}`);
    else lines.push(`- ❌ ${r.label}${r.detailIfFail ? ` — ${r.detailIfFail}` : ""}`);
  }
  return lines;
}

/** ---------- Locate files ---------- */
const studentId = getStudentId();

const indexPath = "index.html";
const hasIndex = fs.existsSync(indexPath);
const indexHtml = hasIndex ? readTextSafe(indexPath) : "";

let linkedCss = null;

if (hasIndex) {
  const hrefs = findCssHrefs(indexHtml);
  for (const href of hrefs) {
    const resolved = resolveFromIndex(href, indexPath);
    if (resolved && fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
      linkedCss = resolved;
      break;
    }
  }
}

if (!linkedCss) {
  // Prefer styles.css if it exists
  linkedCss = fs.existsSync(CSS_FILE_DEFAULT) ? CSS_FILE_DEFAULT : guessCssFileFromRepo();
}

const hasCss = !!(linkedCss && fs.existsSync(linkedCss));
const cssCode = hasCss ? readTextSafe(linkedCss) : "";
const cssEmpty = hasCss ? isEmptyCss(cssCode) : true;

const cssLoadNote = hasCss
  ? cssEmpty
    ? `⚠️ Found \`${linkedCss}\` but it appears empty (or only comments).`
    : `✅ Found \`${linkedCss}\`.`
  : `❌ No CSS file found (expected \`${CSS_FILE_DEFAULT}\` or a stylesheet linked from index.html).`;

/** ---------- Submission status + marks ---------- */
const late = wasSubmittedLate();
let status = 0;

if (!hasCss || cssEmpty) status = 2;
else status = late ? 1 : 0;

const submissionMarks = status === 2 ? 0 : status === 1 ? 10 : 20;

const commitMs = getLatestStudentCommitEpochMs();
const commitIso = commitMs ? new Date(commitMs).toISOString() : "unknown";

const submissionStatusText =
  status === 2
    ? "No submission detected (missing/empty CSS): submission marks = 0/20."
    : status === 1
    ? `Late submission detected via latest *student* commit time: 10/20. (student commit: ${commitIso})`
    : `On-time submission via latest *student* commit time: 20/20. (student commit: ${commitIso})`;

/** ---------- Parse CSS rules (only if CSS exists and not empty) ---------- */
const rules = hasCss && !cssEmpty ? parseCssRules(cssCode) : [];

/** ---------- TODO Checks (9 TODOs) ---------- */
const todoWeights = {
  "TODO 1": 12,
  "TODO 2": 14,
  "TODO 3": 12,
  "TODO 4": 12,
  "TODO 5": 12,
  "TODO 6": 14,
  "TODO 7": 12,
  "TODO 8": 12,
  "TODO 9": 12,
};
const totalWeight = Object.values(todoWeights).reduce((a, b) => a + b, 0);

const tasks = [
  {
    id: "TODO 1",
    name: "Basic Element Selectors (p, span)",
    requirements: () => {
      const reqs = [];

      const hasP = findMatchingRules(rules, "p").length > 0;
      const hasSpan = findMatchingRules(rules, "span").length > 0;

      reqs.push(req('Has a "p { ... }" rule', hasP, "Add a p selector rule."));
      reqs.push(
        req(
          'p rule includes a color-related property',
          ruleSatisfies(rules, "p", { anyProps: RELATED.color }),
          "Use a color property (e.g., color: ...)."
        )
      );
      reqs.push(
        req(
          'p rule includes a font-size-related property',
          ruleSatisfies(rules, "p", { anyProps: RELATED.fontSize }),
          "Use font-size (or font shorthand)."
        )
      );

      reqs.push(req('Has a "span { ... }" rule', hasSpan, "Add a span selector rule."));
      reqs.push(
        req(
          "span rule includes a color-related property",
          ruleSatisfies(rules, "span", { anyProps: RELATED.color }),
          "Use a color property (e.g., color: ...)."
        )
      );
      reqs.push(
        req(
          "span rule includes a font-size-related property",
          ruleSatisfies(rules, "span", { anyProps: RELATED.fontSize }),
          "Use font-size (or font shorthand)."
        )
      );

      return reqs;
    },
  },
  {
    id: "TODO 2",
    name: "Class Selectors (.username, .blue-text, .red-text, .highlight)",
    requirements: () => {
      const reqs = [];

      reqs.push(req('Has a ".username { ... }" rule', findMatchingRules(rules, ".username").length > 0));
      reqs.push(
        req(
          ".username includes a color-related property",
          ruleSatisfies(rules, ".username", { anyProps: RELATED.color }),
          "Use a color property."
        )
      );
      reqs.push(
        req(
          ".username includes a font-weight-related property",
          ruleSatisfies(rules, ".username", { anyProps: RELATED.fontWeight }),
          "Use font-weight (or font shorthand)."
        )
      );

      reqs.push(req('Has a ".blue-text { ... }" rule', findMatchingRules(rules, ".blue-text").length > 0));
      reqs.push(
        req(
          ".blue-text includes a color-related property",
          ruleSatisfies(rules, ".blue-text", { anyProps: RELATED.color }),
          "Use a color property."
        )
      );

      reqs.push(req('Has a ".red-text { ... }" rule', findMatchingRules(rules, ".red-text").length > 0));
      reqs.push(
        req(
          ".red-text includes a color-related property",
          ruleSatisfies(rules, ".red-text", { anyProps: RELATED.color }),
          "Use a color property."
        )
      );

      reqs.push(req('Has a ".highlight { ... }" rule', findMatchingRules(rules, ".highlight").length > 0));
      reqs.push(
        req(
          ".highlight includes a background-related property (background or background-color)",
          ruleSatisfies(rules, ".highlight", { anyProps: RELATED.background }),
          "Use background or background-color."
        )
      );
      reqs.push(
        req(
          ".highlight includes a padding-related property (padding or padding-*)",
          ruleSatisfies(rules, ".highlight", { anyProps: RELATED.padding }),
          "Use padding or padding-*."
        )
      );

      return reqs;
    },
  },
  {
    id: "TODO 3",
    name: "ID Selector (#featured-user)",
    requirements: () => {
      const reqs = [];
      reqs.push(
        req(
          'Has a "#featured-user { ... }" rule',
          findMatchingRules(rules, "#featured-user").length > 0,
          "Add an ID selector rule."
        )
      );
      reqs.push(
        req(
          "#featured-user includes a color-related property",
          ruleSatisfies(rules, "#featured-user", { anyProps: RELATED.color }),
          "Use a color property."
        )
      );
      reqs.push(
        req(
          "#featured-user includes a font-size-related property",
          ruleSatisfies(rules, "#featured-user", { anyProps: RELATED.fontSize }),
          "Use font-size (or font shorthand)."
        )
      );
      return reqs;
    },
  },
  {
    id: "TODO 4",
    name: "Specificity Battle (p, .winner, #specificity-test, p.winner)",
    requirements: () => {
      const reqs = [];

      reqs.push(
        req(
          'Has a "p { ... }" rule with a color-related property',
          ruleSatisfies(rules, "p", { anyProps: RELATED.color }),
          "Add p { color: ... }."
        )
      );
      reqs.push(
        req(
          'Has a ".winner { ... }" rule with a color-related property',
          ruleSatisfies(rules, ".winner", { anyProps: RELATED.color }),
          "Add .winner { color: ... }."
        )
      );
      reqs.push(
        req(
          'Has a "#specificity-test { ... }" rule with a color-related property',
          ruleSatisfies(rules, "#specificity-test", { anyProps: RELATED.color }),
          "Add #specificity-test { color: ... }."
        )
      );

      // Accept p.winner exactly OR a selector that normalizes to "p.winner"
      const hasPWinner = ruleSatisfies(rules, (sel) => sel.replace(/\s+/g, "") === "p.winner", {
        anyProps: RELATED.color,
      });

      reqs.push(
        req(
          'Has a "p.winner { ... }" rule with a color-related property',
          hasPWinner,
          "Add p.winner { color: ... }."
        )
      );

      return reqs;
    },
  },
  {
    id: "TODO 5",
    name: "!important Override (.important-test)",
    requirements: () => {
      const reqs = [];

      reqs.push(
        req(
          'Has a ".important-test { ... }" rule',
          findMatchingRules(rules, ".important-test").length > 0,
          "Add a class selector rule."
        )
      );

      // Must include !important somewhere in the rule; prefer on a property (don’t check values)
      const hasImportant = ruleSatisfies(rules, ".important-test", { mustInclude: ["!important"] });

      reqs.push(
        req(
          '.important-test uses "!important" (on any property)',
          hasImportant,
          'Add !important (e.g., color: ... !important).'
        )
      );

      // Also ensure it declares at least one property (ideally color)
      reqs.push(
        req(
          ".important-test includes at least one declared property",
          (() => {
            const matches = findMatchingRules(rules, ".important-test");
            return matches.some((r) => /:\s*[^;]+;?/.test(r.decls));
          })(),
          "Add at least one property declaration."
        )
      );

      return reqs;
    },
  },
  {
    id: "TODO 6",
    name: "Descendant Selectors (.chat-container .message, .chat-container .message-time)",
    requirements: () => {
      const reqs = [];

      const msgSelRe = /^\.chat-container\s+\.message$/i;
      const timeSelRe = /^\.chat-container\s+\.message-time$/i;

      reqs.push(
        req(
          'Has a ".chat-container .message { ... }" rule',
          findMatchingRules(rules, msgSelRe).length > 0,
          "Use a descendant selector."
        )
      );
      reqs.push(
        req(
          ".chat-container .message includes a color-related property",
          ruleSatisfies(rules, msgSelRe, { anyProps: RELATED.color }),
          "Use a color property."
        )
      );

      reqs.push(
        req(
          'Has a ".chat-container .message-time { ... }" rule',
          findMatchingRules(rules, timeSelRe).length > 0,
          "Use a descendant selector."
        )
      );
      reqs.push(
        req(
          ".chat-container .message-time includes a color-related property",
          ruleSatisfies(rules, timeSelRe, { anyProps: RELATED.color }),
          "Use a color property."
        )
      );
      reqs.push(
        req(
          ".chat-container .message-time includes a font-size-related property",
          ruleSatisfies(rules, timeSelRe, { anyProps: RELATED.fontSize }),
          "Use font-size (or font shorthand)."
        )
      );

      return reqs;
    },
  },
  {
    id: "TODO 7",
    name: "Pseudo-classes (:hover for .send-button and .chat-link)",
    requirements: () => {
      const reqs = [];

      const sendHover = ".send-button:hover";
      const linkHover = ".chat-link:hover";

      reqs.push(
        req(`Has a "${sendHover} { ... }" rule`, findMatchingRules(rules, sendHover).length > 0, "Add :hover rule.")
      );
      reqs.push(
        req(
          `${sendHover} includes a background-related property`,
          ruleSatisfies(rules, sendHover, { anyProps: RELATED.background }),
          "Use background or background-color."
        )
      );
      reqs.push(
        req(
          `${sendHover} includes a color-related property`,
          ruleSatisfies(rules, sendHover, { anyProps: RELATED.color }),
          "Use a color property."
        )
      );

      reqs.push(
        req(`Has a "${linkHover} { ... }" rule`, findMatchingRules(rules, linkHover).length > 0, "Add :hover rule.")
      );
      reqs.push(
        req(
          `${linkHover} includes a color-related property`,
          ruleSatisfies(rules, linkHover, { anyProps: RELATED.color }),
          "Use a color property."
        )
      );
      reqs.push(
        req(
          `${linkHover} includes a text-decoration-related property`,
          ruleSatisfies(rules, linkHover, { anyProps: RELATED.textDecoration }),
          "Use text-decoration (or related property)."
        )
      );

      return reqs;
    },
  },
  {
    id: "TODO 8",
    name: "Group Selectors (h4/h5/h6.trending-tag)",
    requirements: () => {
      const reqs = [];

      const s4 = "h4.trending-tag";
      const s5 = "h5.trending-tag";
      const s6 = "h6.trending-tag";

      const has4 = findMatchingRules(rules, s4).length > 0;
      const has5 = findMatchingRules(rules, s5).length > 0;
      const has6 = findMatchingRules(rules, s6).length > 0;

      reqs.push(
        req(
          "Defines styling for h4.trending-tag, h5.trending-tag, and h6.trending-tag (grouped or separate)",
          has4 && has5 && has6,
          "Ensure all three selectors exist (can be grouped with commas)."
        )
      );

      // Properties can be in any matching rule; don’t require them in the same group block
      const colorOk =
        ruleSatisfies(rules, s4, { anyProps: RELATED.color }) ||
        ruleSatisfies(rules, s5, { anyProps: RELATED.color }) ||
        ruleSatisfies(rules, s6, { anyProps: RELATED.color });

      const familyOk =
        ruleSatisfies(rules, s4, { anyProps: RELATED.fontFamily }) ||
        ruleSatisfies(rules, s5, { anyProps: RELATED.fontFamily }) ||
        ruleSatisfies(rules, s6, { anyProps: RELATED.fontFamily });

      reqs.push(req("Trending tag styles include a color-related property (on any of the three)", colorOk, "Use color."));
      reqs.push(
        req(
          "Trending tag styles include a font-family-related property (or font shorthand) (on any of the three)",
          familyOk,
          "Use font-family or font."
        )
      );

      return reqs;
    },
  },
  {
    id: "TODO 9",
    name: "Universal Selector (*) with box-sizing",
    requirements: () => {
      const reqs = [];
      reqs.push(req('Has a "* { ... }" rule', findMatchingRules(rules, "*").length > 0, "Add the universal selector."));
      reqs.push(
        req(
          "* rule includes box-sizing",
          ruleSatisfies(rules, "*", { anyProps: RELATED.boxSizing }),
          "Use box-sizing: ..."
        )
      );
      return reqs;
    },
  },
];

/** ---------- Grade tasks (weighted -> normalized to TODO_BUCKET_MAX) ---------- */
const taskResults = tasks.map((t) => {
  const reqs = status === 2 ? [req("No submission / empty CSS → cannot grade TODOs", false)] : t.requirements();
  const { fraction, ok, total } = scoreFromRequirements(reqs);
  const weight = todoWeights[t.id] || 0;
  const earnedWeight = status === 2 ? 0 : weight * fraction;

  return {
    id: t.id,
    name: t.name,
    ok,
    total,
    fraction,
    weight,
    earnedWeight,
    reqs,
  };
});

const earnedWeightTotal = taskResults.reduce((sum, r) => sum + r.earnedWeight, 0);

// Normalize to 80 marks for TODO bucket
const earnedTodoMarks = status === 2 ? 0 : Math.round((TODO_BUCKET_MAX * earnedWeightTotal) / totalWeight);

const totalEarned = Math.min(earnedTodoMarks + submissionMarks, TOTAL_MAX);

/** ---------- Build Summary ---------- */
const now = new Date().toISOString();

let summary = `# Lab | ${LAB_NAME} | Autograding Summary

- Student: \`${studentId}\`
- ${cssLoadNote}
- ${submissionStatusText}
- Due (Riyadh): \`${DUE_ISO}\`
- Status: **${status}** (0=on time, 1=late, 2=no submission/empty)
- Run: \`${now}\`

## Marks Breakdown

> TODOs are graded with per-TODO weights (12 each; TODO 2 & 6 are 14) and then normalized into an **${TODO_BUCKET_MAX}-mark** TODO bucket.

| Item | Result |
|------|------:|
`;

for (const tr of taskResults) {
  const pct = tr.total ? Math.round(tr.fraction * 100) : 0;
  summary += `| ${tr.id}: ${tr.name} | ${pct}% of requirements (weight ${tr.weight}) |\n`;
}
summary += `| TODOs (normalized) | ${earnedTodoMarks}/${TODO_BUCKET_MAX} |\n`;
summary += `| Submission | ${submissionMarks}/${SUBMISSION_MAX} |\n`;

summary += `
## Total Marks

**${totalEarned} / ${TOTAL_MAX}**

## Detailed Feedback
`;

for (const tr of taskResults) {
  summary += `\n### ${tr.id}: ${tr.name}\n`;
  summary += formatReqs(tr.reqs).join("\n") + "\n";
}

/** ---------- Write outputs ---------- */
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

/** DO NOT change CSV structure */
const csv = `student_username,obtained_marks,total_marks,status
${studentId},${totalEarned},100,${status}
`;

fs.writeFileSync(path.join(ARTIFACTS_DIR, "grade.csv"), csv);
fs.writeFileSync(path.join(FEEDBACK_DIR, "README.md"), summary);

console.log(`✔ Lab graded: ${totalEarned}/100 (status=${status})`);
