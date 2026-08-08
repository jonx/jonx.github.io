#!/usr/bin/env python3
"""de-AI-ify: replace non-French-keyboard / AI-tell characters with plain ASCII.

Usage:
    python3 .claude/skills/deaiify/deaiify.py            # apply to default file set
    python3 .claude/skills/deaiify/deaiify.py --check    # report only, no edits
    python3 .claude/skills/deaiify/deaiify.py FILE...     # apply to specific files

Run from the repo root. See SKILL.md for the rules.
"""
import os
import sys

# Straight-swap map. Intentional UI glyphs (arrows, the triangle bullet) and
# accented French letters are deliberately absent so they're left untouched.
REPLACEMENTS = {
    "—": "-",    # — em dash
    "–": "-",    # – en dash
    "‒": "-",    # ‒ figure dash
    "―": "-",    # ― horizontal bar
    "…": "...",  # … ellipsis
    "“": '"',    # " left double quote
    "”": '"',    # " right double quote
    "„": '"',    # „ low double quote
    "‘": "'",    # ' left single quote
    "’": "'",    # ' right single quote / curly apostrophe
    "‚": "'",    # ‚ low single quote
    " ": " ",    # non-breaking space
    " ": " ",    # narrow no-break space
    " ": " ",    # thin space
}

# Not auto-replaced: the right fix depends on meaning. Flagged for manual edit.
FLAG_ONLY = {"~": "~ tilde (reword, e.g. '~40 MB' -> 'about 40 MB')"}

DEFAULT_EXTS = (".html", ".css", ".md", ".js")
SKIP_DIRS = {".git", "node_modules"}
SKIP_PREFIXES = (
    "algolia/dataset",              # third-party data, do not rewrite
    ".claude/skills/deaiify",       # this skill's own docs show the chars literally
)


def default_files():
    out = []
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        rel = os.path.relpath(root, ".")
        if any(rel == p or rel.startswith(p + os.sep) for p in SKIP_PREFIXES):
            continue
        for f in files:
            if f.endswith(DEFAULT_EXTS):
                out.append(os.path.relpath(os.path.join(root, f), "."))
    return sorted(out)


def process(path, check):
    try:
        text = open(path, encoding="utf-8").read()
    except (OSError, UnicodeDecodeError) as e:
        print(f"  skip {path}: {e}")
        return 0, 0
    new = text
    changed = 0
    for bad, good in REPLACEMENTS.items():
        c = new.count(bad)
        if c:
            new = new.replace(bad, good)
            changed += c
    flagged = sum(text.count(ch) for ch in FLAG_ONLY)
    if changed and not check:
        open(path, "w", encoding="utf-8").write(new)
    if changed or flagged:
        verb = "would fix" if check else "fixed"
        note = f"  {verb} {changed:>3}  {path}"
        if flagged:
            note += f"   [!] {flagged} tilde(s) left, reword by hand"
        print(note)
    return changed, flagged


def main(argv):
    check = "--check" in argv
    files = [a for a in argv if not a.startswith("--")]
    if not files:
        files = default_files()
    total = tilde = 0
    for p in files:
        c, f = process(p, check)
        total += c
        tilde += f
    print()
    action = "Would replace" if check else "Replaced"
    print(f"{action} {total} character(s) across {len(files)} file(s) scanned.")
    if tilde:
        print(f"{tilde} tilde(s) remain and need a manual reword (see [!] above).")


if __name__ == "__main__":
    main(sys.argv[1:])
