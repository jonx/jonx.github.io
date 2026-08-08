# Claude notes for jkn.me

Operating manual for AI or human edits to this site.

## What this is

A hand-written static site. **No build step, no framework, no bundler, no CI** —
the repo (`jonx/jonx.github.io`) is served verbatim by GitHub Pages behind
Cloudflare at `jkn.me`. Whatever you push to `master` is what ships, roughly a
minute later.

Layout is one directory per thing, each self-contained:

```
/index.html          home page (styles inline, project cards)
/blog/               the blog - see below
/ferail/             Ferail: page, ferail.css, assets/, downloads/
/macaros/            Macaros: page, macaros.css, assets/
/chrome/  /paw/  /pet/
```

House style, shared by every page:

- Dark only. Palette tokens (`--bg-deep`, `--accent: #f4c35d`, `--text-hi/mid/lo`,
  `--stroke`) are duplicated per stylesheet on purpose — keep the values in sync.
- Manrope for text, Cinzel for display headings, both from Google Fonts.
- Every page carries `<title>`, `meta description`, `og:title`, `og:description`,
  a favicon and `theme-color`.
- **Hyphens, not em dashes**, in user-visible copy.
- Absolute paths (`/blog/blog.css`), never relative.

**The canonical host is `https://www.jkn.me`** — the bare `jkn.me` 301s to it at
the Cloudflare edge. Page-internal links stay root-relative and so never care,
but anything that must carry a full URL — `og:image`, `og:url`, feed links and
`<guid>`s — uses the `www` form, or it sends every visitor and subscriber through
a redirect.

`staticwebapp.config.json` is a leftover Azure Static Web Apps file. The site is
on GitHub Pages, so it is **inert** — do not put routing or headers there and
expect them to apply.

## Adding a blog post

The blog has exactly two moving parts you write by hand:

1. **`/blog/posts.json`** — the single source of truth for what is published.
2. **`/blog/<slug>/index.html`** — the post itself, plain static HTML.

`/blog/index.html` fetches `posts.json` on load and renders both the sidebar list
and the card feed from it. **You never edit `/blog/index.html` to publish.**

A third file, **`/blog/feed.xml`** (RSS 2.0), is *generated* from `posts.json` by
`tools/make-feed.py`. Never hand-edit it.

`/blog/blog.css` and `/blog/blog.js` are shared by every post. The stylesheet
provides the prose, article-summary, metadata, tags and contextual-term
components. The script adds the reading-progress bar and upgrades term
definitions from native browser titles to positioned, keyboard-accessible
tooltips. A new post uses both shared files; it does not copy their code.

### Procedure

1. Choose a slug: lowercase, hyphen-separated, no date in it. The directory name
   *is* the URL (`/blog/<slug>/`).
2. Create `/blog/<slug>/index.html` from the template below.
3. Add one entry to `/blog/posts.json`. The renderer sorts by date descending, so
   file order does not matter — but keep newest first so the file reads sensibly.
4. **Regenerate the feed** — subscribers get nothing if you skip this:
   ```sh
   python3 tools/make-feed.py
   ```
   It validates every entry (required fields, parseable date) and refuses to
   write a broken feed. Output is deterministic — `lastBuildDate` is the newest
   post's date, not "now" — so a no-op run produces no diff.
5. Verify locally (see below), then commit **all three files in one commit** and
   push.

### The posts.json entry

All six fields are required. A missing scalar field renders as `undefined` on
the card; missing or malformed tags fail feed generation.

```json
{
  "slug": "why-the-ui-never-blocks",
  "title": "Why the UI never blocks",
  "date": "2026-08-04",
  "category": "Engineering",
  "description": "One rule, and everything it costs to keep it.",
  "tags": ["Interfaces", "Performance", "Architecture"]
}
```

- `slug` must match the directory name exactly.
- `date` must be zero-padded `YYYY-MM-DD`. It is sorted as a **string**, so the
  format is not cosmetic — `2026-8-4` sorts wrong.
- `category` is one or two words; it is displayed uppercase.
- `description` is one or two sentences and should match the page's own
  `meta description`.
- `tags` is a non-empty array of unique topic names. Keep capitalization and
  spelling consistent across posts because the index builds its filters from
  these values.
- Values are **plain text**. The renderer HTML-escapes them, so any markup you
  put here shows up as literal `&lt;b&gt;`.

### The post template

Copy this verbatim and fill in the four marked spots. `body class="post"` and
`<article class="prose">` are what `blog.css` hangs all its styling off.

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>TITLE - John Knipper</title>
    <meta name="description" content="DESCRIPTION" />
    <meta name="theme-color" content="#07040F" />
    <meta property="og:title" content="TITLE - John Knipper" />
    <meta property="og:description" content="DESCRIPTION" />
    <link rel="icon" type="image/png" href="/paw/assets/icon.png" />
    <link
      rel="alternate"
      type="application/rss+xml"
      title="John Knipper"
      href="/blog/feed.xml"
    />
    <link rel="stylesheet" href="/blog/blog.css" />
  </head>
  <body class="post">
    <main class="wrap">
      <a class="back" href="/blog/"><span class="arrow">←</span> All posts</a>

      <header class="post-head">
        <div class="post-meta-row" aria-label="Article details">
          <span class="meta">YYYY-MM-DD · CATEGORY,</span>
          <span class="post-fact reading-time" data-minutes="N"
            >N min read</span
          >
          <span class="post-fact">
            Technical
            <span class="tech-level" aria-label="N out of 5">★★★★★</span>
          </span>
        </div>
        <h1>TITLE</h1>
      </header>

      <article class="prose">
        <aside class="post-summary" aria-labelledby="summary-label">
          <span class="summary-label" id="summary-label">TL;DR</span>
          <p>ONE TO THREE SENTENCES FOR A READER IN A HURRY.</p>
        </aside>

        <p>…</p>

        <nav class="post-tags" aria-label="Article topics">
          <span class="post-tags-label">Topics</span>
          <a class="post-tag" href="/blog/?tag=TAG">TAG</a>
        </nav>
      </article>

      <footer class="site-footer">
        <span>© 2026 John Knipper</span>
        <span class="dot">·</span>
        <a href="/blog/">All posts</a>
        <span class="dot">·</span>
        <a href="/blog/feed.xml">RSS</a>
        <span class="dot">·</span>
        <a href="https://github.com/jonx" target="_blank" rel="noopener"
          >GitHub</a
        >
      </footer>
    </main>
    <script src="/blog/blog.js" defer></script>
  </body>
</html>
```

The date and category appear **twice** — in `posts.json` and in `.post-head .meta`.
Tags also appear in `posts.json` and at the end of the article. Nothing keeps
these copies in sync, so set both.

### Tags and filtering

Use three to six broad, reusable tags per post. Prefer `Filesystems` over a tag
that only one article could ever use, but include a specific project or product
name such as `AROS` when readers may want every post about it. Do not prefix tags
with `#`.

The blog index derives its filter buttons from every post's `tags` array. A
filter is represented in the URL as `/blog/?tag=TAG`, so filtered views can be
bookmarked and shared. The tags at the end of the article link to those views.
They are real navigation, not decorative chips.

Keep the article links and the `posts.json` array identical in spelling and
capitalization. Encode spaces and punctuation in `href` values when needed. The
feed generator validates that every post has a non-empty list of unique,
non-empty tag strings and emits them as RSS categories.

### Reader context, reading time and technical level

This blog covers unrelated projects and subjects. Never assume a reader arrived
from the rest of the site or already knows the topic. Near the start of every
post:

- Say what the central project, product or subject is in one short paragraph.
- Link its canonical page or primary source.
- Explain any directly related John Knipper project and link its page when that
  relationship helps orient the reader.
- Keep the context brief. It is an entrance ramp, not a second introduction.

Every post also carries three quick signals above the main text:

- A `TL;DR` box of one to three sentences that states the result and why it
  matters. It must make sense without reading the title twice.
- A reading-time estimate. Count the article prose at roughly 200 words per
  minute and round up to a whole minute.
- A technical rating from one to five stars. One star is general-interest prose;
  three expects familiarity with the field; five includes implementation-level
  details. Use filled and empty stars as needed (`★★★☆☆`) and keep the numeric
  `aria-label` in sync.

Including `/blog/blog.js` creates a gold reading-progress bar at the top of the
viewport. While the reader scrolls through the article it also shows an updated
`ARTICLE TITLE · N min left` badge, using the heading and the total from
`.reading-time[data-minutes]`. On a narrow screen the title truncates before the
time. At the end of the article the title remains attached to the completed bar
and only the timer disappears. The script measures progress through
`article.prose`; posts do not add their own progress markup or scroll handler.

### Contextual terms

Use contextual definitions sporadically for an acronym, specialist term or
ambiguous word that could make a reader stop. Define the first useful occurrence,
not every occurrence, and do not turn ordinary prose into a field of underlines.
For example, `DOS` in an AROS article needs a definition because many readers
will assume MS-DOS:

```html
<abbr
  class="term"
  title="Disk Operating System, the Amiga-style AROS subsystem for filesystems, volumes, paths, file handles and DOS devices."
  >DOS</abbr
>
```

The term receives a gold dashed underline. Its `title` is a no-JavaScript
fallback; `/blog/blog.js` turns it into a styled tooltip on mouse hover or
keyboard focus. Keep definitions to one plain-text sentence, expand acronyms,
and explain the meaning in this article rather than trying to write a complete
dictionary entry.

### What you can write inside `article.prose`

`blog.css` already styles `h2`, `h3`, `p`, `ul`, `ol`, `li`, `blockquote`,
`code`, `pre > code`, `img`, `hr`, `strong`, `a`, the article summary and
contextual `abbr.term` elements. Two notes:

- Lists get custom markers (`▸` and generated numbers). Do not type your own
  bullets or "1." prefixes.
- Do **not** add a per-post `<style>` block. If a post needs something the sheet
  lacks, add it to `blog.css` so every post gets it.

External links take `target="_blank" rel="noopener"`; internal ones do not.

### Images in a post

Put them in `/blog/<slug>/assets/` — self-contained alongside the post, the same
way project pages work. Resize to at most 1400px wide (`sips -Z 1400 in.png --out
out.png`), keep each under ~400 KB, and always give `alt`, `width` and `height`;
add `loading="lazy"` to anything below the fold. The repo has no LFS and no asset
pipeline, so every byte you add is permanent history.

### Verify before pushing

```sh
python3 -m json.tool blog/posts.json >/dev/null   # invalid JSON empties the whole index
python3 -c "import xml.dom.minidom; xml.dom.minidom.parse('blog/feed.xml')"
cd ~/Source/jkn.me && python3 -m http.server 8811
```

Then open `http://127.0.0.1:8811/blog/` (the post must appear in both the sidebar
and the feed) and `http://127.0.0.1:8811/blog/<slug>/`. **You must serve over
HTTP** — the index `fetch()`es `posts.json`, which fails from `file://`, and the
page then shows "Couldn't load the article list."

After pushing, confirm live:

```sh
curl -s https://jkn.me/blog/posts.json | grep <slug>
curl -s https://jkn.me/blog/feed.xml    | grep <slug>
curl -sI https://jkn.me/blog/<slug>/ | head -1
```

### Known limits

- **A JSON syntax error takes the whole index down**, not just the new post — the
  fetch rejects and every card disappears. Always run the `json.tool` check.
- The index needs JavaScript. Post pages and the RSS feed are static and fine
  without it.
- The feed carries each post's one-line `description`, not its full text — a
  reader shows a summary and links through. Making it full-text would mean
  parsing the post HTML, which nothing here does today.
- Nothing enforces the regeneration step; a post committed without re-running
  `tools/make-feed.py` is live on the site but invisible to subscribers. If in
  doubt, run it — a no-op leaves no diff.
- There is no pagination. Past ~20 posts the card feed gets unwieldy.
- Cloudflare may serve a stale `posts.json` for a short while after a push even
  though the fetch asks for `no-cache`.

## Verification for any change here

- Serve locally with `python3 -m http.server` and load the page — never judge it
  from `file://`, where absolute paths resolve to the filesystem root and the
  page renders unstyled.
- Render it if you can: headless Chrome writes a full-page PNG, which catches
  layout breakage that a 200 response does not.
  ```sh
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
    --disable-gpu --hide-scrollbars --screenshot=out.png --window-size=1200,3600 \
    http://127.0.0.1:8811/blog/
  ```
- Check the narrow layout too; every page is mobile-first.
- Commit only what your change touches. This working tree often carries unrelated
  in-progress edits.
