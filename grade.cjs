#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ARTIFACTS_DIR = "artifacts";
const FEEDBACK_DIR = path.join(ARTIFACTS_DIR, "feedback");
fs.mkdirSync(FEEDBACK_DIR, { recursive: true });

/** Due date: 09/08/2025 11:59 PM Riyadh time (UTC+03:00) */
const DUE_ISO = "2025-08-09T23:59:00+03:00";
const DUE_EPOCH_MS = Date.parse(DUE_ISO);

function getLatestCommitEpochMs() {
  try {
    const out = execSync("git log -1 --format=%ct", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    const seconds = Number(out);
    if (!Number.isFinite(seconds)) return null;
    return seconds * 1000;
  } catch {
    return null;
  }
}

function wasSubmittedLate() {
  const commitMs = getLatestCommitEpochMs();
  if (!commitMs) return false; // best-effort
  return commitMs > DUE_EPOCH_MS;
}

function getStudentId() {
  const repoFull = process.env.GITHUB_REPOSITORY || ""; // org/repo
  const repoName = repoFull.includes("/") ? repoFull.split("/")[1] : repoFull;

  // GitHub Classroom often ends with username
  const fromRepoSuffix =
    repoName && repoName.includes("-") ? repoName.split("-").slice(-1)[0] : "";

  return process.env.STUDENT_USERNAME || fromRepoSuffix || process.env.GITHUB_ACTOR || repoName || "student";
}

/** CSS helpers */
function stripCssComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}
function normalizeSelector(sel) {
  return sel.trim().replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ");
}
function parseCssRules(cssText) {
  const css = stripCssComments(cssText);
  const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
  const rules = [];
  let match;
  while ((match = ruleRegex.exec(css)) !== null) {
    const selectorText = match[1] ?? "";
    const body = match[2] ?? "";
    const selectors = selectorText
      .split(",")
      .map((s) => normalizeSelector(s))
      .filter(Boolean);
    rules.push({ selectors, body });
  }
  return rules;
}
function bodyHasProperty(body, propName) {
  const re = new RegExp(`(^|[;\\s])${propName}\\s*:`, "i");
  return re.test(body);
}
function bodyHasImportantForProperty(body, propName) {
  const re = new RegExp(`${propName}\\s*:[^;]*!important`, "i");
  return re.test(body);
}
function findMatchingRules(rules, selectorQuery) {
  const q = normalizeSelector(selectorQuery);
  return rules.filter((r) => r.selectors.some((s) => s === q));
}
function checkSelectorProperties(rules, selectorQuery, props, options = {}) {
  const { requireImportantFor = [] } = options;
  const matchedRules = findMatchingRules(rules, selectorQuery);

  if (matchedRules.length === 0) {
    return {
      selector: selectorQuery,
      foundRule: false,
      missing: props.map((p) =>
        requireImportantFor.includes(p) ? `${p} (with !important)` : p
      ),
      presentCount: 0,
      totalCount: props.length,
    };
  }

  const missing = [];
  let presentCount = 0;

  for (const prop of props) {
    const needsImportant = requireImportantFor.includes(prop);
    const present = matchedRules.some((r) => bodyHasProperty(r.body, prop));
    const importantOk = !needsImportant
      ? true
      : matchedRules.some((r) => bodyHasImportantForProperty(r.body, prop));

    if (present && importantOk) presentCount += 1;
    else missing.push(needsImportant ? `${prop} (with !important)` : prop);
  }

  return {
    selector: selectorQuery,
    foundRule: true,
    missing,
    presentCount,
    totalCount: props.length,
  };
}
function scoreFromChecks(checks, maxMarks) {
  const totalProps = checks.reduce((s, c) => s + c.totalCount, 0);
  const presentProps = checks.reduce((s, c) => s + c.presentCount, 0);
  if (totalProps === 0) return { earned: 0, presentProps: 0 };
  return { earned: Math.round((maxMarks * presentProps) / totalProps), presentProps };
}

/** Load styles.css */
const cssPath = "styles.css";
const studentId = getStudentId();

const hasStyles = fs.existsSync(cssPath);
let cssText = "";
let cssLoadNote = "";

if (!hasStyles) {
  cssLoadNote = "❌ Missing `styles.css` → tasks cannot be detected (0/80).";
} else {
  cssText = fs.readFileSync(cssPath, "utf8");
  cssLoadNote = "✅ Found `styles.css`.";
}

const rules = cssText ? parseCssRules(cssText) : [];

/** Tasks */
const tasks = [
  {
    id: "TODO 1",
    name: "Basic Element Selectors",
    marks: 10,
    checks: () => [
      checkSelectorProperties(rules, "p", ["color", "font-size"]),
      checkSelectorProperties(rules, "span", ["color", "font-size"]),
    ],
  },
  {
    id: "TODO 2",
    name: "Class Selectors",
    marks: 10,
    checks: () => [
      checkSelectorProperties(rules, ".username", ["color", "font-weight"]),
      checkSelectorProperties(rules, ".blue-text", ["color"]),
      checkSelectorProperties(rules, ".red-text", ["color"]),
      checkSelectorProperties(rules, ".highlight", ["background-color", "padding"]),
    ],
  },
  {
    id: "TODO 3",
    name: "ID Selectors",
    marks: 10,
    checks: () => [checkSelectorProperties(rules, "#featured-user", ["color", "font-size"])],
  },
  {
    id: "TODO 4",
    name: "Specificity Battle",
    marks: 10,
    checks: () => [
      checkSelectorProperties(rules, "p", ["color"]),
      checkSelectorProperties(rules, ".winner", ["color"]),
      checkSelectorProperties(rules, "#specificity-test", ["color"]),
      checkSelectorProperties(rules, "p.winner", ["color"]),
    ],
  },
  {
    id: "TODO 5",
    name: "!important Override",
    marks: 10,
    checks: () => [
      checkSelectorProperties(rules, ".important-test", ["color"], {
        requireImportantFor: ["color"],
      }),
    ],
  },
  {
    id: "TODO 6",
    name: "Descendant Selectors",
    marks: 10,
    checks: () => [
      checkSelectorProperties(rules, ".chat-container .message", ["color"]),
      checkSelectorProperties(rules, ".chat-container .message-time", ["color", "font-size"]),
    ],
  },
  {
    id: "TODO 7",
    name: "Pseudo-classes",
    marks: 10,
    checks: () => [
      checkSelectorProperties(rules, ".send-button:hover", ["background-color", "color"]),
      checkSelectorProperties(rules, ".chat-link:hover", ["color", "text-decoration"]),
    ],
  },
  {
    id: "TODO 8 + 9",
    name: "Group Selectors + Universal Selector",
    marks: 10,
    checks: () => [
      checkSelectorProperties(rules, "h4.trending-tag", ["color", "font-family"]),
      checkSelectorProperties(rules, "h5.trending-tag", ["color", "font-family"]),
      checkSelectorProperties(rules, "h6.trending-tag", ["color", "font-family"]),
      checkSelectorProperties(rules, "*", ["box-sizing"]),
    ],
  },
];

/** Grade tasks */
let earnedTasks = 0;
let presentPropsAcrossAll = 0;

const taskResults = tasks.map((t) => {
  const checks = t.checks();
  const { earned, presentProps } = scoreFromChecks(checks, t.marks);
  earnedTasks += hasStyles ? earned : 0;

  // count how many required properties were found overall (for status=2 detection)
  presentPropsAcrossAll += presentProps;

  const issues = [];
  for (const c of checks) {
    if (!c.foundRule) {
      issues.push(
        `- Missing rule for selector \`${normalizeSelector(c.selector)}\` (required properties: ${c.missing.join(", ")})`
      );
    } else if (c.missing.length > 0) {
      issues.push(`- Selector \`${normalizeSelector(c.selector)}\` is missing: ${c.missing.join(", ")}`);
    }
  }

  return {
    id: t.id,
    name: t.name,
    earned: hasStyles ? earned : 0,
    max: t.marks,
    issues: hasStyles ? issues : [cssLoadNote],
  };
});

/** Status + submission marks */
const late = wasSubmittedLate();
let status = late ? 1 : 0;

// status=2 means: submitted but implemented none of the tasks (0 properties detected)
if (hasStyles && presentPropsAcrossAll === 0) {
  status = 2;
}

const submissionMarks = hasStyles ? (late ? 10 : 20) : 0; // if no styles.css, treat as no meaningful submission for this lab
const submissionStatusText = hasStyles
  ? late
    ? "Late submission detected via latest commit time: 10/20."
    : "On-time submission via latest commit time: 20/20."
  : "No `styles.css` found: submission marks = 0/20.";

const totalEarned = Math.min(earnedTasks + submissionMarks, 100);

/** Build summary */
const now = new Date().toISOString();
let summary = `# Lab | 3.1 CSS Basics | Autograding Summary

- Student: \`${studentId}\`
- ${cssLoadNote}
- ${submissionStatusText}
- Due (Riyadh): \`${DUE_ISO}\`
- Status: **${status}** (0=on time, 1=late, 2=submitted but no tasks implemented)
- Run: \`${now}\`

## Marks Breakdown

| Item | Marks |
|------|------:|
`;

for (const tr of taskResults) {
  summary += `| ${tr.id}: ${tr.name} | ${tr.earned}/${tr.max} |\n`;
}
summary += `| Submission | ${submissionMarks}/20 |\n`;

summary += `
## Total Marks

**${totalEarned} / 100**

## Feedback (What to Fix)
`;

let hadAnyIssues = false;
for (const tr of taskResults) {
  if (tr.issues.length > 0) {
    hadAnyIssues = true;
    summary += `\n### ${tr.id}: ${tr.name}\n${tr.issues.join("\n")}\n`;
  }
}

if (!hadAnyIssues && hasStyles) {
  summary += `\n✅ No missing required CSS properties were detected.\n`;
}

// Special message if status=2
if (status === 2) {
  summary += `\n⚠️ **Status=2:** Your submission was detected, but none of the required CSS properties for the lab tasks were found.\n`;
}

/** Write outputs */
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}

fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const csv = `student_username,obtained_marks,total_marks,status
${studentId},${totalEarned},100,${status}
`;

fs.writeFileSync(path.join(ARTIFACTS_DIR, "grade.csv"), csv);
fs.writeFileSync(path.join(FEEDBACK_DIR, "README.md"), summary);

console.log(`✔ Lab graded: ${totalEarned}/100 (status=${status})`);
