# jonx.github.io - PUBLIC WEB ROOT

> **Warning for humans and AIs alike: every file in this folder ships to
> `https://jkn.me` on the next push to the default branch.** Azure
> Static Web Apps watches this repo and deploys the whole tree
> verbatim. There is no staging step and no allow-list.

## Do not put private data here

That includes, but is not limited to:

- API keys, tokens, or secrets of any kind - even placeholders.
- Internal runbooks, infrastructure topology, or vendor account
  details. Operational docs belong in a private repo, not here.
- Personally identifiable information, private email addresses, draft
  legal correspondence, or anything that would be awkward as a public
  URL like `jkn.me/whatever.md`.
- Customer or user data.

If you are not sure whether a file belongs here, assume it doesn't.

## What this folder is for

Only the public-facing surface of `jkn.me` and its project subpaths:

- `index.html`, `404.html` - the top-level personal site.
- `paw/`, `pet/`, `chrome/`, `algolia/` - per-project landing subpages.
  Note that `paw/` is a stub linking out to `pawseebility.com`; the
  canonical PawSeeBility landing lives in that sibling submodule, not
  here.
- `staticwebapp.config.json` - Azure Static Web Apps routing config.
- Static assets referenced by those pages.

## Previewing locally

Don't open the files from Finder - the pages use absolute paths like
`/blog/blog.css`, so `file://` resolves them against your disk root and
everything 404s. Serve the folder over HTTP instead, where `/` maps to
the repo root:

```
cd path/to/this/repo
python3 -m http.server 8000
```

Then open <http://localhost:8000/>. Edit a file and just refresh; press
`Ctrl-C` to stop. (This doesn't apply the `staticwebapp.config.json`
routing rules - for those, use `swa start` from the Azure Static Web Apps
CLI, which serves on <http://localhost:4280>.)

## The sibling folder in the PawSeeBility checkout works the same way

When this repo is mounted as the `site/` submodule inside the
PawSeeBility workspace, it sits next to a `landing/` submodule that
auto-deploys to `https://pawseebility.com` via Cloudflare Pages on
every push to its `main`. The same rule applies to both: anything
dropped into either folder and pushed goes live publicly. Treat them
with equal caution.
