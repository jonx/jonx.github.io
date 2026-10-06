import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/clipto/");
});

test("plain prose retains ordinary punctuation and simple newlines", async ({
  page,
}) => {
  const input =
    "Bonjour.\nRendez-vous demain (10h) !\nBudget: 12.50 euros - merci.\nsnake_case et C:\\Documents\\notes";
  await page.locator("#input").fill(input);
  await page.locator("#input-mode").selectOption("plain");
  await expect(page.locator("#output")).toHaveValue(input);
});

test("plain mode protects actual Markdown syntax without decorating prose", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { convert, markdownToHtml } = await import("/clipto/convert.js");
    const text =
      "# Not a heading\n> Not a quote\n1. Not a list\n- Not a bullet\n\n**literal** and _literal_ and `code`\n[label](https://example.com)";
    const md = convert({ text }, "markdown", "plain").text;
    return { md, html: markdownToHtml(md) };
  });
  expect(result.md).toContain("\\# Not a heading\n\\> Not a quote");
  expect(result.html).not.toMatch(/<(h1|blockquote|ol|ul|strong|em|code)[\s>]/);
});

test("HTML wins in auto mode even when the text looks like Markdown", async ({
  page,
}) => {
  await page.locator("#input").evaluate((el) => {
    const data = new DataTransfer();
    data.setData("text/plain", "> quoted email\n1. Important");
    data.setData(
      "text/html",
      "<p><strong>Important</strong> <em>formatting</em></p><table><tr><th>Item</th></tr><tr><td>One</td></tr></table>",
    );
    el.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(page.locator("#output")).toHaveValue(
    /\*\*Important\*\* \*formatting\*/,
  );
  await expect(page.locator("#output")).toHaveValue(/\| Item \|/);
  await page.locator("#input-mode").selectOption("markdown");
  await expect(page.locator("#output")).toHaveValue(
    "> quoted email\n1. Important",
  );
});

test("multiple-item warning remains visible after reading", async ({
  page,
}) => {
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        read: async () => [
          { types: ["image/png"] },
          {
            types: ["text/plain"],
            getType: async () => new Blob(["First text"]),
          },
          {
            types: ["text/plain"],
            getType: async () => new Blob(["Second text"]),
          },
        ],
      },
    }),
  );
  await page.locator("#read").click();
  await expect(page.locator("#output")).toHaveValue("First text");
  await expect(page.locator("#status")).toContainText(
    "Plusieurs éléments détectés",
  );
});

test("oversized content explains what failed", async ({ page }) => {
  const message = await page.evaluate(async () => {
    const { convert, MAX_LENGTH } = await import("/clipto/convert.js");
    try {
      convert({ text: "x".repeat(MAX_LENGTH + 1) }, "markdown");
    } catch (error) {
      return error.message;
    }
  });
  expect(message).toBe(
    "Ce contenu est trop long. Essayez un extrait de moins de 200 000 caractères.",
  );
});

test("Mac shortcut falls back to userAgent when platform is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "platform", {
      configurable: true,
      value: "",
    });
    Object.defineProperty(navigator, "userAgentData", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
    });
  });
  await page.reload();
  await expect(page.locator("#paste-key")).toHaveText("⌘ V");
});

test("plain Markdown keeps identifiers and literal table separators", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { convert, markdownToHtml } = await import("/clipto/convert.js");
    const text =
      "snake_case_name\n\n| Item | State |\n| --- | --- |\n| A | B |";
    const md = convert({ text }, "markdown", "plain").text;
    return { md, html: markdownToHtml(md) };
  });
  expect(result.md).toContain("snake_case_name");
  expect(result.html).not.toContain("<table>");
});

test("language switch preserves input, selected format and mode", async ({
  page,
}) => {
  const external = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:8812")) external.push(r.url());
  });
  await page.locator("#input").fill("Bonjour.\nMon contenu **littéral** !");
  await page.locator("#input-mode").selectOption("plain");
  await page.locator("[data-target=html]").click();
  const output = await page.locator("#output").inputValue();
  await page.locator("#language").click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toHaveText("Copy. Choose. Paste.");
  await expect(page.locator("#copy")).toContainText("Copy HTML code");
  await expect(page.locator("#input")).toHaveValue(
    "Bonjour.\nMon contenu **littéral** !",
  );
  await expect(page.locator("#output")).toHaveValue(output);
  await expect(page.locator("#input-mode")).toHaveValue("plain");
  expect(new URL(page.url()).searchParams.get("lang")).toBe("en");
  await page.locator("#language").click();
  await expect(page.locator("h1")).toHaveText("Copiez. Choisissez. Collez.");
  await expect(page.locator("#output")).toHaveValue(output);
  expect(external).toEqual([]);
});

test("English link loads translated controls and error messages directly", async ({
  page,
}) => {
  await page.goto("/clipto/?lang=en");
  await expect(page.locator("#read")).toContainText("Read clipboard");
  await expect(page.locator("#count")).toHaveText("0 characters");
  await expect(page.locator("#input")).toHaveAttribute(
    "placeholder",
    /A Markdown note/,
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        read: async () => {
          throw new DOMException("No", "NotAllowedError");
        },
      },
    }),
  );
  await page.locator("#read").click();
  await expect(page.locator("#status")).toContainText("Reading was denied.");
  await page.locator("#example").click();
  await expect(page.locator("#source-origin")).toHaveText("Example");
  await expect(page.locator("#output")).toHaveValue(/Ideas travel/);
  await expect(page.locator("#copy")).toContainText("Copy Markdown");
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("all scripts including transitive modules carry the same asset version", async ({
  page,
}) => {
  const scripts = [];
  page.on("request", (r) => {
    if (/\.(?:m?js)(?:\?|$)/.test(r.url())) scripts.push(new URL(r.url()));
  });
  await page.reload();
  await page.locator("#example").click();
  expect(scripts.length).toBeGreaterThanOrEqual(6);
  for (const url of scripts)
    expect(url.searchParams.get("v")).toBe("20261006-2");
});

test("modern platform information takes precedence over legacy hints", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "platform", {
      configurable: true,
      value: "MacIntel",
    });
    Object.defineProperty(navigator, "userAgentData", {
      configurable: true,
      value: { platform: "Windows" },
    });
  });
  await page.reload();
  await expect(page.locator("#paste-key")).toHaveText("Ctrl V");
});

test("share metadata points to a real 1200 by 630 image", async ({
  page,
  request,
}) => {
  const url = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(url).toBe("https://www.jkn.me/clipto/share.png");
  const response = await request.get(new URL(url).pathname);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
  const png = await response.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
});
