---
name: deaiify
description: Strip AI-tell / non-French-keyboard characters (em dashes, en dashes, curly quotes, ellipsis char, non-breaking spaces, tilde) from files or text and replace them with plain ASCII typeable on an AZERTY Mac, so the writing reads as hand-authored. Use when asked to "de-AI-ify", "remove em dashes", "clean up the punctuation", "make it look human-written", or before publishing site copy.
---

# de-AI-ify text

The site owner writes on a French Mac (AZERTY) keyboard and wants nothing in
his files that he couldn't type on it. Those same characters are also the
classic giveaway that text was machine-written. This skill replaces them with
plain ASCII.

## Rules

Replace every occurrence:

| Character              | Replace with        |
| ---------------------- | ------------------- |
| `—` em dash            | `-` hyphen          |
| `–` en dash, `‒` `―`   | `-` hyphen          |
| `…` ellipsis           | `...`               |
| `"` `"` curly double   | `"` straight        |
| `'` `'` curly single   | `'` straight        |
| non-breaking space, narrow/thin space | ordinary space |

**Tilde `~` is not auto-replaced** because the fix depends on meaning. Rewrite
the phrase instead: `~40 MB` becomes `about 40 MB`, `~5 min` becomes
`about 5 min`. The script flags remaining tildes so you can fix them by hand.

## Keep these (do NOT touch)

These are intentional design glyphs in the jkn.me markup, not prose tells:

- Arrow characters `→` `←` `↗` used in project cards, back-links, and external
  link markers.
- The `▸` triangle used as a CSS bullet.
- Accented French letters (`é è à ç` ...) — they ARE on the keyboard and are
  correct French.

## How to run

The helper script lives next to this file. Run it from the repo root.

```
# Report what would change, per file (no edits):
python3 .claude/skills/deaiify/deaiify.py --check

# Apply to the default site file set (*.html, *.css, *.md; skips .git and
# algolia/dataset data files):
python3 .claude/skills/deaiify/deaiify.py

# Apply to specific files only:
python3 .claude/skills/deaiify/deaiify.py blog/some-post/index.html
```

After running, the script prints any files that still contain a `~` so you can
reword them. Then preview locally (`python3 -m http.server 8000`) and confirm
nothing looks off — a spaced em dash becoming ` - ` occasionally reads better as
a comma or a reworded sentence, so skim the prose.

## Also applies to text you generate

This isn't only a cleanup tool. Whenever you write copy, commit messages, or
docs for this repo, default to the plain-ASCII punctuation above from the start
so there's nothing to strip later.
