#!/usr/bin/env python3
"""Generate /blog/feed.xml from /blog/posts.json.

The site has no build step, so the feed is a committed file like everything
else - this script just keeps it from being hand-written XML that drifts out of
sync with posts.json. Run it after every change to posts.json:

    python3 tools/make-feed.py

Output is deterministic: lastBuildDate is the newest post's date, not "now", so
re-running with no new posts leaves the file byte-identical and produces no diff.
"""

import json
import pathlib
import sys
from email.utils import format_datetime
from datetime import datetime, timezone
from xml.sax.saxutils import escape

SITE = "https://jkn.me"
TITLE = "John Knipper"
DESCRIPTION = "Notes from building small, sharp tools - extensions, apps, and experiments."
LANGUAGE = "en"

ROOT = pathlib.Path(__file__).resolve().parent.parent
POSTS = ROOT / "blog" / "posts.json"
FEED = ROOT / "blog" / "feed.xml"

REQUIRED = ("slug", "title", "date", "category", "description")


def rfc822(date: str) -> str:
    """'2026-07-07' -> 'Tue, 07 Jul 2026 00:00:00 +0000'."""
    dt = datetime.strptime(date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    return format_datetime(dt)


def main() -> int:
    posts = json.loads(POSTS.read_text())

    for post in posts:
        missing = [f for f in REQUIRED if not post.get(f)]
        if missing:
            print(f"error: post {post.get('slug', '?')!r} is missing {missing}", file=sys.stderr)
            return 1
        rfc822(post["date"])  # raises on a malformed date rather than shipping one

    posts.sort(key=lambda p: p["date"], reverse=True)
    built = rfc822(posts[0]["date"]) if posts else rfc822("2026-01-01")

    items = []
    for post in posts:
        url = f"{SITE}/blog/{post['slug']}/"
        items.append(
            "    <item>\n"
            f"      <title>{escape(post['title'])}</title>\n"
            f"      <link>{escape(url)}</link>\n"
            f"      <guid isPermaLink=\"true\">{escape(url)}</guid>\n"
            f"      <pubDate>{rfc822(post['date'])}</pubDate>\n"
            f"      <category>{escape(post['category'])}</category>\n"
            f"      <description>{escape(post['description'])}</description>\n"
            "    </item>"
        )

    feed = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
        "  <channel>\n"
        f"    <title>{escape(TITLE)}</title>\n"
        f"    <link>{SITE}/blog/</link>\n"
        f"    <description>{escape(DESCRIPTION)}</description>\n"
        f"    <language>{LANGUAGE}</language>\n"
        f"    <lastBuildDate>{built}</lastBuildDate>\n"
        f'    <atom:link href="{SITE}/blog/feed.xml" rel="self" type="application/rss+xml" />\n'
        + "\n".join(items)
        + "\n  </channel>\n</rss>\n"
    )

    FEED.write_text(feed)
    print(f"wrote {FEED.relative_to(ROOT)} - {len(posts)} item(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
