import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadShell() {
  const [html, css] = await Promise.all([
    readFile(path.join(ROOT, "index.html"), "utf8"),
    readFile(path.join(ROOT, "styles.css"), "utf8")
  ]);
  return { html, css };
}

function ruleDeclarations(css, selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `missing ${selector} rule`);

  return Object.fromEntries(
    match[1]
      .split(";")
      .map((declaration) => declaration.split(/:(.*)/s).map((part) => part.trim()))
      .filter(([property, value]) => property && value)
  );
}

function cssVariables(css) {
  return new Map(Array.from(css.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g), ([, name, value]) => [name, value.trim()]));
}

function resolveVariables(value, variables) {
  let resolved = value;
  for (let pass = 0; pass < 8 && /var\(--[\w-]+\)/.test(resolved); pass += 1) {
    resolved = resolved.replace(/var\(--([\w-]+)\)/g, (token, name) => variables.get(name) ?? token);
  }
  return resolved;
}

function parseColor(token) {
  if (/^black$/i.test(token)) return { red: 0, green: 0, blue: 0, alpha: 1 };

  if (token.startsWith("#")) {
    const source = token.slice(1);
    const expanded = source.length <= 4
      ? Array.from(source, (character) => character.repeat(2)).join("")
      : source;
    const [red, green, blue] = [0, 2, 4].map((offset) => Number.parseInt(expanded.slice(offset, offset + 2), 16));
    const alpha = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;
    return { red, green, blue, alpha };
  }

  const components = token
    .slice(token.indexOf("(") + 1, -1)
    .split(/[\s,\/]+/)
    .filter(Boolean);
  const channel = (value) => value.endsWith("%") ? Number.parseFloat(value) * 2.55 : Number.parseFloat(value);
  return {
    red: channel(components[0]),
    green: channel(components[1]),
    blue: channel(components[2]),
    alpha: components[3] === undefined ? 1 : Number.parseFloat(components[3])
  };
}

function colorsIn(value) {
  return Array.from(
    value.matchAll(/#[\da-f]{3,8}\b|rgba?\([^)]*\)|\bblack\b/gi),
    ([token]) => ({ token, ...parseColor(token) })
  );
}

test("dialogue markup keeps narration and responses in one stable bottom flow", async () => {
  const { html, css } = await loadShell();
  const sectionStart = html.indexOf('<section class="dialogue" id="dialogue"');
  const bubbleStart = html.indexOf('class="dialogue-bubble" id="dialogue-bubble"', sectionStart);
  const guideLine = html.indexOf('id="guide-line"', bubbleStart);
  const responseStart = html.indexOf('class="dialogue-response" id="dialogue-response"', guideLine);
  const stopTitle = html.indexOf('id="stop-title"', responseStart);
  const answers = html.indexOf('id="answers"', stopTitle);
  const sectionEnd = html.indexOf("</section>", answers);

  assert.ok(sectionStart >= 0, "dialogue section should exist");
  assert.ok(sectionStart < bubbleStart && bubbleStart < guideLine, "speaker narration should stay inside the first dialogue surface");
  assert.ok(guideLine < responseStart && responseStart < stopTitle, "the response tray should follow narration instead of occupying a side rail");
  assert.ok(stopTitle < answers && answers < sectionEnd, "response controls should stay inside the bottom tray");

  const dialogue = ruleDeclarations(css, ".dialogue");
  assert.equal(dialogue.position, "fixed");
  assert.equal(dialogue.inset, "0");
  assert.equal(dialogue.display, "flex");
  assert.equal(dialogue["flex-direction"], "column");
  assert.equal(dialogue["justify-content"], "flex-end");
  assert.equal(dialogue.gap, "0");
  assert.match(dialogue.padding, /var\(--safe-bottom\)/);

  const bubble = ruleDeclarations(css, ".dialogue-bubble");
  const response = ruleDeclarations(css, ".dialogue-response");
  assert.equal(bubble.width, response.width, "narration and responses should form one continuous panel");
  assert.equal(bubble["border-bottom"], "0");
  assert.match(bubble["border-radius"], /0 0$/);
  assert.match(response["border-radius"], /^0 0/);
  assert.equal(ruleDeclarations(css, ".dialogue-bubble::after").content, "none");
});

test("dialogue presentation has no world-space anchor contract", async () => {
  const { html, css } = await loadShell();
  const presentation = `${html}\n${css}`;

  assert.doesNotMatch(presentation, /data-anchor(?:ed)?/i);
  assert.doesNotMatch(css, /--(?:dialogue|conversation)-(?:x|y|left|top|anchor|tail|placement|depth)/i);
  assert.doesNotMatch(css, /\[(?:data-)?anchor(?:ed)?[^\]]*\]/i);
});

test("primary chrome is transparent while dialogue content uses light themed surfaces", async () => {
  const { css } = await loadShell();
  for (const selector of [".topbar", ".mission-rail", ".dialogue"]) {
    const declarations = ruleDeclarations(css, selector);
    assert.equal(declarations.background, "transparent", `${selector} should not render an enclosing bar`);
    assert.equal(declarations.border, "0", `${selector} should not render an enclosing frame`);
  }

  assert.equal(ruleDeclarations(css, ".dialogue")["box-shadow"], "none");
  const variables = cssVariables(css);
  for (const selector of [".dialogue-bubble", ".dialogue-response"]) {
    const declarations = ruleDeclarations(css, selector);
    const [surface] = colorsIn(resolveVariables(declarations.background, variables));
    assert.ok(surface, `${selector} should define a concrete themed background`);
    assert.ok(
      surface.red >= 180 && surface.green >= 180 && surface.blue >= 180 && surface.alpha >= 0.9,
      `${selector} should remain a light, opaque surface; received ${surface.token}`
    );
    assert.match(declarations.width, /min\(/, `${selector} should remain viewport-bounded`);
  }
});

test("visible surfaces do not reintroduce black or near-black paint", async () => {
  const { css } = await loadShell();
  const variables = cssVariables(css);
  const surfaceDeclaration = /(?:background(?:-color)?|border(?:-(?:top|right|bottom|left))?(?:-color)?|(?:box|text)-shadow|filter)\s*:\s*([^;}]+)/gi;
  const failures = [];

  for (const match of css.matchAll(surfaceDeclaration)) {
    const resolved = resolveVariables(match[1], variables);
    for (const color of colorsIn(resolved)) {
      const isVisible = Number.isFinite(color.alpha) && color.alpha > 0.05;
      const isNearBlack = Math.max(color.red, color.green, color.blue) <= 48;
      if (isVisible && isNearBlack) failures.push(`${match[0].trim()} -> ${color.token}`);
    }
  }

  assert.deepEqual(failures, [], `near-black surface paint found:\n${failures.join("\n")}`);
});
