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

`staticwebapp.config.json` is a leftover Azure Static Web Apps file. The site is
on GitHub Pages, so it is **inert** — do not put routing or headers there and
expect them to apply.

## Adding a blog post

The blog has exactly two moving parts:

1. **`/blog/posts.json`** — the single source of truth for what is published.
2. **`/blog/<slug>/index.html`** — the post itself, plain static HTML.

`/blog/index.html` fetches `posts.json` on load and renders both the sidebar list
and the card feed from it. **You never edit `/blog/index.html` to publish.**

### Procedure

1. Choose a slug: lowercase, hyphen-separated, no date in it. The directory name
   *is* the URL (`/blog/<slug>/`).
2. Create `/blog/<slug>/index.html` from the template below.
3. Add one entry to `/blog/posts.json`. The renderer sorts by date descending, so
   file order does not matter — but keep newest first so the file reads sensibly.
4. Verify locally (see below), then commit **both files in one commit** and push.

### The posts.json entry

All five fields are required. A missing one renders as `undefined` on the card.

```json
{
  "slug": "why-the-ui-never-blocks",
  "title": "Why the UI never blocks",
  "date": "2026-08-04",
  "category": "Engineering",
  "description": "One rule, and everything it costs to keep it."
}
```

- `slug` must match the directory name exactly.
- `date` must be zero-padded `YYYY-MM-DD`. It is sorted as a **string**, so the
  format is not cosmetic — `2026-8-4` sorts wrong.
- `category` is one or two words; it is displayed uppercase.
- `description` is one or two sentences and should match the page's own
  `meta description`.
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
    <link rel="stylesheet" href="/blog/blog.css" />
  </head>
  <body class="post">
    <main class="wrap">
      <a class="back" href="/blog/"><span class="arrow">←</span> All posts</a>

      <header class="post-head">
        <span class="meta">YYYY-MM-DD · CATEGORY</span>
        <h1>TITLE</h1>
      </header>

      <article class="prose">
        <p>…</p>
      </article>

      <footer class="site-footer">
        <span>© 2026 John Knipper</span>
        <span class="dot">·</span>
        <a href="/blog/">All posts</a>
        <span class="dot">·</span>
        <a href="https://github.com/jonx" target="_blank" rel="noopener"
          >GitHub</a
        >
      </footer>
    </main>
  </body>
</html>
```

The date and category appear **twice** — in `posts.json` and in `.post-head .meta`.
Nothing keeps them in sync, so set both.

### What you can write inside `article.prose`

`blog.css` already styles `h2`, `h3`, `p`, `ul`, `ol`, `li`, `blockquote`,
`code`, `pre > code`, `img`, `hr`, `strong` and `a`. Two notes:

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
cd ~/Source/jkn.me && python3 -m http.server 8811
```

Then open `http://127.0.0.1:8811/blog/` (the post must appear in both the sidebar
and the feed) and `http://127.0.0.1:8811/blog/<slug>/`. **You must serve over
HTTP** — the index `fetch()`es `posts.json`, which fails from `file://`, and the
page then shows "Couldn't load the article list."

After pushing, confirm live:

```sh
curl -s https://jkn.me/blog/posts.json | grep <slug>
curl -sI https://jkn.me/blog/<slug>/ | head -1
```

### Known limits

- **A JSON syntax error takes the whole index down**, not just the new post — the
  fetch rejects and every card disappears. Always run the `json.tool` check.
- The index needs JavaScript. Post pages are static and fine without it.
- There is **no RSS feed** and no pagination. Past ~20 posts the card feed gets
  unwieldy.
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
