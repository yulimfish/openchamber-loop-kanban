import { expect, test } from "bun:test";

const sources = await Promise.all([
  Bun.file("panel/main.ts").text(),
  Bun.file("panel/page.ts").text(),
  Bun.file("src/render-panel.ts").text(),
  Bun.file("src/render-page.ts").text(),
]);
const source = sources.join("\n");

test("every surface applies every Host ready context", () => {
  expect(source.match(/applyHostReady\(/g)?.length).toBeGreaterThanOrEqual(2);
  expect(source).toContain("document.documentElement");
  expect(source).toContain("document.documentElement.lang = context.locale");
});

test("renderers use the OpenChamber UI kit without hard-coded visual tokens", () => {
  expect(source).toContain("@openchamber/sdk/ui");
  expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}|rgb\(|font-family\s*:/);
});

test("extension-owned labels use the Host locale with a defined fallback", () => {
  expect(source).toContain("formatMessage");
  expect(source).toContain('"zh-CN"');
  expect(source).toContain('"en"');
});

test("full page loads a responsive four-column layout using Host theme tokens", async () => {
  const stylesheet = Bun.file("panel/page.css");
  expect(await stylesheet.exists()).toBe(true);

  const [html, css] = await Promise.all([
    Bun.file("panel/page.html").text(),
    stylesheet.text(),
  ]);
  const narrowScreenStyles = css.match(/@media \(max-width: 760px\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const narrowBoardStyles = narrowScreenStyles.match(/#app > \[data-loop-kanba-slot="board"\]\s*\{([^}]*)\}/)?.[1] ?? "";

  expect(html).toContain('href="./page.css"');
  expect(css).toContain("repeat(4, minmax(0, 1fr))");
  expect(narrowBoardStyles).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  expect(css).toContain("var(--oc-bg)");
  expect(css).toContain("var(--oc-border)");
  expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}|rgba?\(/);
});
