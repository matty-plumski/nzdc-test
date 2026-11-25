#!/usr/bin/env python3

from pathlib import Path
import argparse
import re

DOCS = Path("docs")

ENTRY_RE = re.compile(
    r"(?m)^###\s+.*$"
)

TAG_RE = re.compile(
    r"<\s*(/?)\s*(i|b|em|strong|sup|sub)\b[^>]*>",
    re.IGNORECASE,
)


def split_entries(text):
    matches = list(ENTRY_RE.finditer(text))

    for i, match in enumerate(matches):
        end = (
            matches[i + 1].start()
            if i + 1 < len(matches)
            else len(text)
        )

        yield (
            match.start(),
            end,
            match.group(0),
            text[match.start():end],
        )


def inspect_tags(block):
    stack = []
    unexpected = []

    for match in TAG_RE.finditer(block):
        closing = bool(match.group(1))
        tag = match.group(2).lower()

        if not closing:
            stack.append(tag)
            continue

        if stack and stack[-1] == tag:
            stack.pop()
        else:
            unexpected.append(tag)

    return stack, unexpected


def repair_entry(block):
    open_tags, unexpected = inspect_tags(block)

    # Conservative safety rule:
    # exactly ONE unmatched opening tag,
    # and ZERO unexpected closing tags.
    if len(open_tags) != 1:
        return block, None

    if unexpected:
        return block, None

    tag = open_tags[0]

    # Insert the closing tag before trailing whitespace
    # at the entry boundary.
    match = re.search(r"\s*$", block)
    position = match.start()

    repaired = (
        block[:position]
        + "</{}>".format(tag)
        + block[position:]
    )

    return repaired, tag


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--write",
        action="store_true",
        help="Apply repairs. Default is dry run.",
    )

    args = parser.parse_args()

    files_changed = 0
    entries_fixed = 0

    for path in sorted(DOCS.glob("*.md")):
        original = path.read_text(
            encoding="utf-8-sig"
        )

        replacements = []

        for start, end, heading, block in split_entries(
            original
        ):
            repaired, tag = repair_entry(block)

            if tag is None:
                continue

            entries_fixed += 1

            print(
                "{} | {} | add </{}>".format(
                    path,
                    heading,
                    tag,
                )
            )

            replacements.append(
                (start, end, repaired)
            )

        if not replacements:
            continue

        files_changed += 1

        if args.write:
            revised = original

            # Replace backwards so offsets remain valid.
            for start, end, repaired in reversed(
                replacements
            ):
                revised = (
                    revised[:start]
                    + repaired
                    + revised[end:]
                )

            path.write_text(
                revised,
                encoding="utf-8",
            )

    print()
    print("Safe entries identified:", entries_fixed)
    print("Affected files:", files_changed)

    if not args.write:
        print("DRY RUN ONLY - no files changed.")


if __name__ == "__main__":
    main()