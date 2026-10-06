import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.copied = [];
    window.clipboardReads = 0;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        read: async () => {
          window.clipboardReads++;
          return [
            {
              types: ["text/plain", "text/html"],
              getType: async (type) =>
                new Blob(
                  [
                    type === "text/html"
                      ? "<h2>Équipe</h2><p><strong>Important</strong><br>John<br>Paris</p>"
                      : "Équipe\nImportant\nJohn\nParis",
                  ],
                  { type },
                ),
            },
          ];
        },
        writeText: async (value) => window.copied.push({ text: value }),
        write: async (items) => {
          const output = {};
          for (const item of items)
            for (const type of item.types)
              output[type] = await (await item.getType(type)).text();
          window.copied.push(output);
        },
      },
    });
  });
  await page.goto("/clipto/");
});

test("does not read automatically; lists actual formats and copies Markdown as text", async ({
  page,
}) => {
  expect(await page.evaluate(() => window.clipboardReads)).toBe(0);
  await expect(page.locator("#copy")).toBeDisabled();
  await page.locator("#read").click();
  await expect(page.locator("#formats")).toContainText("HTML");
  await expect(page.locator("#output")).toHaveValue(/## Équipe/);
  await expect(page.locator("#output")).toHaveValue(/\*\*Important\*\*/);
  await page.locator("#copy").click();
  const copied = await page.evaluate(() => window.copied[0]);
  expect(Object.keys(copied)).toEqual(["text"]);
  expect(copied.text).toContain("John\\\nParis");
});

test("rich copy writes HTML and plain text, then plain removes formatting", async ({
  page,
}) => {
  await page
    .locator("#input")
    .fill("# Bonjour\n\n**Café ☕**\n\n- Premier\n- Second");
  await page.locator("[data-target=rich]").click();
  await expect(page.frameLocator("#rich-preview").locator("h1")).toHaveText(
    "Bonjour",
  );
  await page.locator("#copy").click();
  await expect(page.locator("#status")).toContainText("Texte enrichi copié");
  const rich = await page.evaluate(() => window.copied[0]);
  expect(rich["text/html"]).toContain("<strong>Café ☕</strong>");
  expect(rich["text/plain"]).not.toContain("**");
  await page.locator("[data-target=plain]").click();
  await page.locator("#copy").click();
  const plain = await page.evaluate(() => window.copied[1]);
  expect(Object.keys(plain)).toEqual(["text"]);
  expect(plain.text).toContain("• Premier");
});

test("denied read offers manual paste and retains rich paste formats", async ({
  page,
}) => {
  await page.evaluate(
    () =>
      (navigator.clipboard.read = async () => {
        throw new DOMException("No", "NotAllowedError");
      }),
  );
  await page.locator("#read").click();
  await expect(page.locator("#status")).toContainText("Lecture non autorisée");
  await page.locator("#input").evaluate((el) => {
    const data = new DataTransfer();
    data.setData("text/plain", "bonjour");
    data.setData("text/html", "<p><b>bonjour</b></p>");
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(page.locator("#output")).toHaveValue("**bonjour**");
  await expect(page.locator("#source-origin")).toHaveText("Collage manuel");
  await page.locator("#input").fill("Texte corrigé");
  await expect(page.locator("#formats")).not.toContainText("HTML");
});

test("image-only input is reported without pretending it is convertible", async ({
  page,
}) => {
  await page.evaluate(
    () => (navigator.clipboard.read = async () => [{ types: ["image/png"] }]),
  );
  await page.locator("#read").click();
  await expect(page.locator("#formats")).toContainText("Image PNG");
  await expect(page.locator("#status")).toContainText(
    "ne contiennent pas de texte",
  );
  await expect(page.locator("#copy")).toBeDisabled();
});

test("Office lists, CSS emphasis, tables and explicit breaks survive conversion", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { convert } = await import("/clipto/convert.js");
    const source = {
      text: "",
      html: '<style>span.Bold{font-weight:700}</style><p><span class="Bold">Équipe</span><br>Paris</p><p style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">3. </span>Premier</p><p style="mso-list:l0 level2 lfo1"><span style="mso-list:Ignore">• </span>Sous-point</p><table><tr><th>Nom</th><th>État</th></tr><tr><td>Web</td><td>Prêt</td></tr></table>',
    };
    return convert(source, "markdown");
  });
  expect(result.text).toContain("**Équipe**\\\nParis");
  expect(result.text).toContain("3. Premier");
  expect(result.text).toContain("    - Sous-point");
  expect(result.text).toMatch(/\|.*Nom.*\|/);
});

test("untrusted HTML cannot run scripts or load external preview resources", async ({
  page,
}) => {
  const external = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:8812")) external.push(r.url());
  });
  await page
    .locator("#input")
    .fill(
      '<p onclick="alert(1)">Hello <b>World</b></p><script>window.PWNED=true</script><img src="https://example.com/tracker" onerror="alert(1)"><a href="javascript:alert(1)">click</a><iframe src="https://example.com"></iframe>',
    );
  await page.locator("#input-mode").selectOption("html");
  await page.locator("[data-target=rich]").click();
  await expect(page.frameLocator("#rich-preview").locator("strong")).toHaveText(
    "World",
  );
  await page.locator("#copy").click();
  await expect(page.locator("#status")).toContainText("Texte enrichi copié");
  const html = await page.evaluate(() => window.copied[0]["text/html"]);
  expect(html).not.toMatch(/<script|<img|<iframe|onclick|onerror|javascript:/i);
  expect(await page.evaluate(() => window.PWNED)).toBeUndefined();
  expect(external).toEqual([]);
});

test("example, clear, download and mobile layout", async ({
  page,
}, testInfo) => {
  await page.locator("#example").click();
  expect(await page.evaluate(() => window.clipboardReads)).toBe(0);
  await expect(page.locator("#source-origin")).toHaveText("Exemple");
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#download").click();
  expect((await downloadPromise).suggestedFilename()).toBe("clipto.md");
  if (testInfo.project.name === "chromium")
    await page.screenshot({ path: testInfo.outputPath("desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator("#copy")).toBeEnabled();
  if (testInfo.project.name === "chromium")
    await page.screenshot({ path: testInfo.outputPath("mobile.png"), fullPage: true });
  await page.locator("#clear").click();
  await expect(page.locator("#copy")).toBeDisabled();
  expect(await page.evaluate(() => window.copied.length)).toBe(0);
});

test("copy failure never reports success and permits manual copying", async ({
  page,
}) => {
  await page.locator("#input").fill("bonjour");
  await page.evaluate(
    () =>
      (navigator.clipboard.writeText = async () => {
        throw new DOMException("No", "NotAllowedError");
      }),
  );
  await page.locator("#copy").click();
  await expect(page.locator("#status")).toContainText("Copie non autorisée");
  await expect(page.locator("#output")).toBeFocused();
});
