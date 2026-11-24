#!/usr/bin/env python3
"""Rewrite legacy ../A#anchor links to the split Markdown file containing anchor.
Run from the repository root.
"""
from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

try:
    from markdown.extensions.toc import slugify_unicode
except ImportError:
    print("Install MkDocs first: python -m pip install -r requirements.txt", file=sys.stderr)
    raise

HEADING_RE = re.compile(r"^###\s+(.+?)\s*$", re.MULTILINE)
LEGACY_LINK_RE = re.compile(r"(?P<prefix>\.\./)(?P<letter>[A-Z])(?:\.md)?/?#(?P<anchor>[^)\s]+)")
SKIP_NAMES = {"index.md", "mkdocs.yml", "README.md", "READ.md"}


def build_anchor_map(docs: Path):
    by_anchor = defaultdict(list)
    for path in sorted(docs.glob("*.md")):
        if path.name in SKIP_NAMES:
            continue
        text = path.read_text(encoding="utf-8-sig", errors="strict")
        for heading in HEADING_RE.findall(text):
            anchor = slugify_unicode(heading, "-")
            by_anchor[anchor].append(path.name)
    return by_anchor


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--docs", default="docs", help="MkDocs source directory")
    parser.add_argument("--write", action="store_true", help="Write replacements; default is dry-run")
    args = parser.parse_args()
    docs = Path(args.docs)
    if not docs.is_dir():
        raise SystemExit(f"Not found: {docs}")

    anchors = build_anchor_map(docs)
    changed_files = 0
    fixed = 0
    unresolved = []
    ambiguous = []

    for path in sorted(docs.glob("*.md")):
        text = path.read_text(encoding="utf-8-sig", errors="strict")

        def replace(match):
            nonlocal fixed
            anchor = match.group("anchor")
            candidates = anchors.get(anchor, [])
            if len(candidates) == 1:
                fixed += 1
                return f"{candidates[0]}#{anchor}"
            if not candidates:
                unresolved.append((path.name, match.group(0)))
            else:
                ambiguous.append((path.name, match.group(0), candidates))
            return match.group(0)

        revised = LEGACY_LINK_RE.sub(replace, text)
        if revised != text:
            changed_files += 1
            print(f"{'UPDATE' if args.write else 'WOULD UPDATE'} {path}")
            if args.write:
                path.write_text(revised, encoding="utf-8")

    print(f"\nResolved links: {fixed}")
    print(f"Changed files: {changed_files}")
    print(f"Unresolved links: {len(unresolved)}")
    print(f"Ambiguous links: {len(ambiguous)}")

    if unresolved:
        print("\nUnresolved examples:")
        for source, link in unresolved[:30]:
            print(f"  {source}: {link}")
    if ambiguous:
        print("\nAmbiguous examples:")
        for source, link, candidates in ambiguous[:30]:
            print(f"  {source}: {link} -> {', '.join(candidates)}")

    if unresolved or ambiguous:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
