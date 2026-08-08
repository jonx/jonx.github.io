---
name: new-blog-post
description: Add a new article to the jkn.me blog. Use whenever the user wants to write, draft, or publish a blog post / article on jkn.me - creates the post page under /blog/<slug>/ and registers it on the blog index. Triggers include "new blog post", "write an article", "add a post to the blog", "publish a post".
---

# Add a new blog post to jkn.me

The blog is hand-written static HTML under `/blog/` - no CMS, no build step.
Every file ships verbatim to `https://jkn.me` on the next push to the default
branch (Azure Static Web Apps). There is no staging step. Treat everything you
write as immediately public; never include secrets, private data, or anything
awkward as a public URL.

## Structure you're working with

- `/blog/posts.json` - **the single source of truth** for what's published. An
  array of `{slug, title, date, category, description}`, newest-first-agnostic
  (the page sorts by date). The blog index reads this at runtime to render both
  the left-hand article list and the card feed. **Adding a post = adding one
  entry here.**
- `/blog/index.html` - the index page. It's fully dynamic (fetches
  `posts.json`); you almost never edit it.
- `/blog/blog.css` - shared styles. **Do not add per-post CSS.** Everything a
  post needs (`article.prose` handles headings, lists, quotes, code, images) is
  already there. If a genuinely new style is needed, add it to `blog.css` so all
  posts share it.
- `/blog/<slug>/index.html` - one folder per post.
- `.claude/skills/new-blog-post/post-template.html` - copy this for a new post.

## Gather these before writing

Ask the user for anything not already provided:

1. **Title** - human title, e.g. "How jkSpeed handles iframe videos".
2. **Slug** - kebab-case, URL-safe, e.g. `jkspeed-iframe-videos`. Derive from
   the title if the user doesn't specify; confirm it.
3. **Date** - `YYYY-MM-DD`. Use today's date unless told otherwise. Never guess;
   if unsure, ask.
4. **Category** - one short word shown in the meta line (e.g. `Meta`, `Build
   log`, `Chrome`, `Teardown`). Reuse an existing one when it fits.
5. **Description** - one sentence for `<meta description>`, Open Graph, and the
   index card blurb.
6. **Body** - the article itself. If the user gives prose or Markdown, convert it
   to the prose HTML vocabulary below.
7. **Image** - **every post must have at least one image.** Pick (or ask for) a
   hero shot, put it in the post's `assets/` folder, and use it three ways: as
   an `<img>` in the body, as `og:image` (absolute `https://www.jkn.me/...`
   URL), and as the `"image"` field in `posts.json` (root-relative path) so
   the RSS feed carries it as an `<enclosure>` thumbnail. `tools/make-feed.py`
   refuses to build without it.

## Steps

1. **Create the post folder and page.** Copy `post-template.html` to
   `/blog/<slug>/index.html` and fill in every `{{PLACEHOLDER}}`:
   - `{{TITLE}}` in `<title>`, `og:title`, and the `<h1>`.
   - `{{DESCRIPTION}}` in `<meta name="description">` and `og:description`.
   - `{{DATE}}` and `{{CATEGORY}}` in the `.meta` line (format: `2026-07-07 · Meta`).
   - `{{BODY}}` - replace with the article HTML inside `<article class="prose">`.

2. **Register it in `posts.json`.** Add one object to the array in
   `/blog/posts.json`. Order doesn't matter - the index sorts by `date`
   descending. Keep the JSON valid (watch trailing commas):
   ```json
   {
     "slug": "<slug>",
     "title": "<Title>",
     "date": "YYYY-MM-DD",
     "category": "<Category>",
     "description": "<One-sentence description.>",
     "tags": ["<Tag>", "<Tag>"],
     "image": "/blog/<slug>/assets/<hero>.png"
   }
   ```
   Do **not** edit `/blog/index.html` - it renders itself from this file.
   Then regenerate the feed: `python3 tools/make-feed.py` (it validates every
   entry, including that the image exists, and rewrites `/blog/feed.xml`).

3. **Verify locally.** From the repo root, serve and confirm 200s:
   ```
   python3 -m http.server 8099 >/dev/null 2>&1 &
   ```
   Then open `http://localhost:8099/blog/` and `.../blog/<slug>/`. Check the new
   card links correctly and the post renders. Kill the server when done. (Note:
   `curl` may be unavailable on this machine; use a browser or Python's urllib.)

4. **Do not push unless asked.** Report what changed and remind the user the post
   goes live the moment they push to the default branch.

## Body HTML vocabulary (`article.prose`)

Write plain semantic HTML - the stylesheet does the rest. Use:

- `<p>` for paragraphs.
- `<h2>` for section headings, `<h3>` for sub-sections. (The post title is the
  `<h1>` in the header - don't add another `<h1>`.)
- `<ul><li>` / `<ol><li>` for lists - bullets and numbers are styled
  automatically; don't add your own markers.
- `<a href>` for links. Internal links are root-relative (`/`, `/blog/`,
  `/chrome/`). External links get `target="_blank" rel="noopener"`.
- `<strong>` for emphasis, `<blockquote>` for pulled quotes.
- `<code>` for inline code, `<pre><code>` for blocks.
- `<img src="/blog/<slug>/assets/...">` - put post images in an `assets/`
  subfolder of the post. Always include `alt`.
- `<hr>` for a section break.

Match the site's voice: concise, concrete, understated. Short paragraphs.

## Conventions

- Favicon and OG image stay as the shared `/paw/assets/icon.png` unless the post
  supplies its own image.
- Keep the back-link (`← All posts`) and footer from the template unchanged.
- Dates are ISO `YYYY-MM-DD`; categories are Title Case.
