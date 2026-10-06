import { Marked } from "./vendor/marked.js?v=20261006-2";
import DOMPurify from "./vendor/purify.mjs?v=20261006-2";

export const MAX_LENGTH = 200000;
export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const marked = new Marked({ gfm: true, breaks: false });
marked.use({
  renderer: {
    html({ text }) {
      return escapeHtml(text);
    },
  },
});
const cleaner = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: [
    "script",
    "iframe",
    "object",
    "embed",
    "form",
    "input",
    "button",
    "textarea",
    "select",
    "video",
    "audio",
    "source",
    "link",
    "meta",
    "base",
    "svg",
    "math",
  ],
  FORBID_ATTR: ["srcset", "background", "action", "formaction", "autofocus"],
};

function doc(html) {
  if (html.length > MAX_LENGTH)
    throw new Error(
      "Ce contenu est trop long. Essayez un extrait de moins de 200 000 caractères.",
    );
  return new DOMParser().parseFromString(
    DOMPurify.sanitize(html, { ...cleaner, WHOLE_DOCUMENT: true }),
    "text/html",
  );
}

export function looksMarkdown(text) {
  return /(^|\n)\s*(#{1,6} |[-*+] |\d+\. |>|```|\| )|\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)/.test(
    text,
  );
}

function semanticDocument(html) {
  const d = doc(html);
  const rules = [];
  for (const style of d.querySelectorAll("style")) {
    for (const rule of style.textContent.split("}")) {
      const i = rule.lastIndexOf("{");
      if (i < 0) continue;
      for (const selector of rule
        .slice(0, i)
        .split(",")
        .map((x) => x.trim())) {
        if (/^(?:span|p|div)?\.[\w-]+$/.test(selector))
          rules.push([selector, rule.slice(i + 1)]);
      }
    }
  }
  d.querySelectorAll("style").forEach((n) => n.remove());
  for (const image of d.querySelectorAll("img"))
    image.replaceWith(
      d.createTextNode(image.alt ? `[Image : ${image.alt}]` : "[Image]"),
    );
  for (const node of [...d.querySelectorAll("span,p,div,b,i,strong,em")]) {
    if (!node.isConnected) continue;
    let style =
      rules
        .filter(([selector]) => node.matches(selector))
        .map(([, value]) => value)
        .join(";") +
      ";" +
      (node.getAttribute("style") || "");
    const properties = Object.fromEntries(
      style
        .split(";")
        .map((x) => x.split(/:(.*)/s))
        .filter((x) => x.length > 1)
        .map(([k, v]) => [
          k.trim().toLowerCase(),
          v
            .trim()
            .toLowerCase()
            .replace(/\s*!important$/, ""),
        ]),
    );
    const list = properties["mso-list"] || "";
    if (node.tagName === "P" && /level\d+/.test(list)) {
      const marker = [...node.querySelectorAll("[style]")].find((n) =>
        /mso-list\s*:\s*ignore/i.test(n.getAttribute("style")),
      );
      const numbering = marker?.textContent.trim() || "";
      node.dataset.listLevel = String(
        Math.min(12, Number(list.match(/level(\d+)/)?.[1] || 1)),
      );
      node.dataset.listMarker = /^\d+[.)]/.test(numbering)
        ? numbering.match(/^\d+/)[0] + "."
        : "-";
      marker?.remove();
    }
    if (list === "ignore") {
      node.remove();
      continue;
    }
    const wrappers = [];
    if (
      (/^(bold|bolder)$/.test(properties["font-weight"]) ||
        Number(properties["font-weight"]) >= 600) &&
      !["B", "STRONG"].includes(node.tagName)
    )
      wrappers.push("strong");
    if (
      /^(italic|oblique)/.test(properties["font-style"]) &&
      !["I", "EM"].includes(node.tagName)
    )
      wrappers.push("em");
    if (
      /line-through/.test(
        properties["text-decoration"] ||
          properties["text-decoration-line"] ||
          "",
      )
    )
      wrappers.push("del");
    for (const tag of wrappers) {
      const wrapper = d.createElement(tag);
      while (node.firstChild) wrapper.append(node.firstChild);
      node.append(wrapper);
    }
    node.removeAttribute("style");
  }
  return d;
}

export function htmlToMarkdown(html) {
  const converter = new window.TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    fence: "```",
    emDelimiter: "*",
  });
  converter.use(window.turndownPluginGfm.gfm);
  converter.addRule("lineBreak", { filter: "br", replacement: () => "\\\n" });
  converter.addRule("officeList", {
    filter: (n) => n.hasAttribute("data-list-level"),
    replacement: (content, node) =>
      "\n" +
      "    ".repeat(Number(node.dataset.listLevel) - 1) +
      node.dataset.listMarker +
      " " +
      content.trim() +
      "\n",
  });
  return converter.turndown(semanticDocument(html).body);
}

function cleanRendered(html) {
  return DOMPurify.sanitize(html, {
    ...cleaner,
    FORBID_TAGS: [...cleaner.FORBID_TAGS, "style", "img"],
    FORBID_ATTR: [
      ...cleaner.FORBID_ATTR,
      "style",
      "id",
      "name",
      "class",
      "src",
    ],
  });
}

export function markdownToHtml(markdown) {
  return cleanRendered(marked.parse(markdown));
}

export function htmlToPlain(html) {
  const d = doc(html);
  const walk = (node, depth = 0) => {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return "";
    const tag = node.tagName;
    if (["SCRIPT", "STYLE", "HEAD"].includes(tag)) return "";
    if (tag === "BR") return "\n";
    if (tag === "IMG") return node.alt ? `[Image : ${node.alt}]` : "[Image]";
    if (tag === "UL" || tag === "OL") {
      let count = Number(node.getAttribute("start") || 1);
      return (
        "\n" +
        [...node.children]
          .map(
            (li) =>
              "  ".repeat(depth) +
              (tag === "OL" ? `${count++}. ` : "• ") +
              [...li.childNodes]
                .map((n) => walk(n, depth + 1))
                .join("")
                .trim() +
              "\n",
          )
          .join("")
      );
    }
    if (tag === "PRE") return "\n" + node.textContent + "\n";
    if (tag === "TABLE")
      return (
        "\n" +
        [...node.querySelectorAll("tr")]
          .map((tr) =>
            [...tr.children].map((td) => td.textContent.trim()).join(" | "),
          )
          .join("\n") +
        "\n"
      );
    let content = [...node.childNodes].map((n) => walk(n, depth)).join("");
    if (tag === "A") {
      const href = node.getAttribute("href");
      if (href && /^(https?:|mailto:)/i.test(href) && href !== content.trim())
        content += ` (${href})`;
    }
    return /^(P|DIV|H[1-6]|BLOCKQUOTE)$/.test(tag)
      ? "\n" + content + "\n"
      : content;
  };
  return walk(d.body)
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Preserve ordinary prose. Escape Markdown constructs, not sentence punctuation.
export function plainToMarkdown(text) {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .replace(/\\(?=[\\`*_{}\[\]<>()#+.!|~=-])/g, "\\\\")
    .split("\n");
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|");
    if (
      lines[i].includes("|") &&
      lines[i - 1].includes("|") &&
      cells.every((cell) => /^:?-+:?$/.test(cell.trim()))
    ) {
      lines[i - 1] = lines[i - 1].replace(/\|/g, "\\|");
      lines[i] = lines[i].replace(/\|/g, "\\|");
    }
  }
  return lines
    .join("\n")
    .replace(
      /(`+|\*{1,3}|_{1,3}|~~)(?=\S)([^\n]*?\S)\1/g,
      (match, marker, content, offset, input) => {
        if (
          marker[0] === "_" &&
          (/\w/.test(input[offset - 1] || "") ||
            /\w/.test(input[offset + match.length] || ""))
        )
          return match;
        return (
          [...marker].map((c) => "\\" + c).join("") +
          content +
          [...marker].map((c) => "\\" + c).join("")
        );
      },
    )
    .replace(/\[(?=[^\]\n]*\](?:\(|\[|:))/g, "\\[")
    .replace(/<(?=\/?[a-z!])/gi, "\\<")
    .replace(/&(?=(?:#\d+|#x[\da-f]+|[a-z]+);)/gi, "\\&")
    .replace(/^( {0,3})(#{1,6})(?=\s|$)/gm, "$1\\$2")
    .replace(/^([ \t]*)(>)/gm, "$1\\$2")
    .replace(/^([ \t]*)([-+*])(?=[ \t])/gm, "$1\\$2")
    .replace(/^([ \t]*\d{1,9})([.)])(?=[ \t])/gm, "$1\\$2")
    .replace(/^( {0,3})(`{3,}|~{3,})/gm, "$1\\$2")
    .replace(/^( {0,3})([-=]+)([ \t]*)$/gm, "$1\\$2$3");
}

export function convert(source, target, mode = "auto") {
  const text = source.text || "";
  if (text.length > MAX_LENGTH || (source.html || "").length > MAX_LENGTH)
    throw new Error(
      "Ce contenu est trop long. Essayez un extrait de moins de 200 000 caractères.",
    );
  const kind =
    mode === "auto"
      ? source.html
        ? "html"
        : looksMarkdown(text)
          ? "markdown"
          : "plain"
      : mode;
  const htmlInput = mode === "html" ? text : source.html;
  let markdown;
  if (kind === "html") markdown = htmlToMarkdown(htmlInput || text);
  else if (kind === "plain") markdown = plainToMarkdown(text);
  else markdown = text;
  const html =
    kind === "plain"
      ? "<p>" + escapeHtml(text).replace(/\n/g, "<br>") + "</p>"
      : markdownToHtml(markdown);
  const plain = kind === "plain" ? text : htmlToPlain(html);
  let richHtml = html;
  richHtml = richHtml.replace(
    /<h([1-6])>/g,
    (_, level) =>
      `<h${level} style="font-size:${[2, 1.5, 1.25, 1.1, 1, 0.9][Number(level) - 1]}em;font-weight:bold">`,
  );
  richHtml = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5">${richHtml}</div>`;
  return {
    text: target === "markdown" ? markdown : target === "html" ? html : plain,
    html: richHtml,
    kind,
  };
}

export function previewDocument(html, interactive = false) {
  return (
    "<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; form-action 'none'; base-uri 'none'\"><style>body{font:14px/1.65 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#354a30;padding:8px 0;margin:0;overflow-wrap:anywhere}h1,h2,h3{line-height:1.3}a{color:#51753a;" +
    (interactive ? "" : "pointer-events:none") +
    "}pre{white-space:pre-wrap;background:#f3f5ef;padding:12px;border-radius:4px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #dbe2d1;padding:7px;text-align:left}blockquote{border-left:3px solid #bfceb2;margin-left:0;padding-left:14px;color:#708062}img{display:none}" +
    (interactive
      ? ""
      : "body{color:#f4eff9;background:#191323}a{color:#ffb578}pre{background:#211a2b}td,th{border-color:#3b3048}blockquote{border-color:#ffb578;color:#b8acc5}") +
    "</style></head><body>" +
    html +
    "</body></html>"
  );
}
