#!/usr/bin/env python3
"""Linter for blog markdown frontmatter.

Validates every src/content/blog/**/*.md against the schema defined in
src/content.config.ts, auto-computes readingTime, cleans macOS ._* files,
and spell-checks Spanish text via wordfreq (optional dependency, bundled dict).

Setup (once):
    python3 -m venv .venv && .venv/bin/pip install wordfreq
Usage:
    .venv/bin/python scripts/lint_blog.py   # full spell check
    python3 scripts/lint_blog.py            # works too, but spell check is skipped
Exit code 0 if no errors, 1 otherwise. Curate false positives in scripts/spell-allow.txt.
"""

from __future__ import annotations

import difflib
import math
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOG_DIR = ROOT / "src" / "content" / "blog"
CONFIG = ROOT / "src" / "content.config.ts"
ALLOW_FILE = Path(__file__).resolve().parent / "spell-allow.txt"

WPM = 200  # average Spanish prose reading speed (words per minute)
MIN_WORD_LEN = 4  # ignore short tokens to cut spell-check noise
CANDIDATE_POOL = 40000  # top-N Spanish words used as suggestion candidates

REQUIRED_FIELDS = ("id", "slug", "title", "publishedDate", "category", "isDraft")
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

GREEN = "\033[1;32m"
RED = "\033[1;31m"
AMBER = "\033[1;33m"
RESET = "\033[0m"

WORD_RE = re.compile(r"[a-záéíóúñü]+", re.IGNORECASE)

_speller = None  # (is_known fn, candidate list) when wordfreq is available, else False


def load_allowlist() -> set[str]:
    """Domain terms to never flag (proper nouns, tech jargon). One word per line."""
    if not ALLOW_FILE.exists():
        return set()
    words = ALLOW_FILE.read_text(encoding="utf-8").splitlines()
    return {w.strip().lower() for w in words if w.strip() and not w.startswith("#")}


def get_speller():
    """Lazily load the wordfreq Spanish dictionary. Returns (is_known, candidates)
    or False if wordfreq is absent."""
    global _speller
    if _speller is None:
        try:
            from wordfreq import top_n_list, zipf_frequency

            def is_known(word: str) -> bool:
                return zipf_frequency(word, "es") > 0

            _speller = (is_known, top_n_list("es", CANDIDATE_POOL))
        except ImportError:
            _speller = False
    return _speller


def spell_check(raw: str, allow: set[str]) -> list[str]:
    """Return spelling findings with line:column, scanning title + body only.

    Uses wordfreq (bundled Spanish dict) to detect unknown words and difflib to
    suggest a fix. Returns nothing when wordfreq is not installed.
    """
    speller = get_speller()
    if not speller:
        return []
    is_known, candidates = speller
    findings: list[str] = []
    dashes = 0

    for lineno, line in enumerate(raw.splitlines(), start=1):
        if line.strip() == "---":
            dashes += 1
            continue

        if dashes < 2:  # inside frontmatter: only scan the title value
            if not line.strip().startswith("title:"):
                continue
            offset = line.index(":") + 1
            text = line[offset:]
        else:  # body
            offset = 0
            text = line

        for match in WORD_RE.finditer(text):
            word = match.group()
            lower = word.lower()
            if len(lower) < MIN_WORD_LEN or lower in allow:
                continue

            if is_known(lower):
                continue
            guess = difflib.get_close_matches(lower, candidates, n=1, cutoff=0.8)
            fix = guess[0] if guess else "?"

            col = offset + match.start() + 1
            findings.append(f"ortografía (L{lineno}:C{col}): '{word}' → '{fix}'")

    return findings


def clean_appledouble() -> int:
    """Delete macOS AppleDouble (._*) files across the whole repo. Returns count removed."""
    removed = 0
    for path in ROOT.rglob("._*"):
        if path.is_file():
            path.unlink()
            removed += 1
    return removed


def load_categories() -> list[str]:
    """Extract the category enum from content.config.ts (single source of truth)."""
    text = CONFIG.read_text(encoding="utf-8")
    match = re.search(r"category:\s*z\.enum\(\[(.*?)\]\)", text, re.DOTALL)
    if not match:
        sys.exit("ERROR: could not find category enum in content.config.ts")
    return re.findall(r'"([^"]+)"', match.group(1))


def parse_frontmatter(raw: str) -> tuple[dict[str, str], str] | None:
    """Split a markdown file into (frontmatter dict, body). Returns None if absent."""
    if not raw.startswith("---"):
        return None
    parts = raw.split("---", 2)
    if len(parts) < 3:
        return None
    fields: dict[str, str] = {}
    for line in parts[1].strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or ":" not in line:
            continue
        key, value = line.split(":", 1)
        fields[key.strip()] = value.strip().strip('"').strip("'")
    return fields, parts[2].strip()


def reading_time_minutes(body: str) -> int:
    """Estimate reading time in minutes from the body word count (min 1)."""
    words = len(body.split())
    return max(1, math.ceil(words / WPM))


def upsert_field(raw: str, key: str, value, before: str | None = None) -> str:
    """Set key: value in the frontmatter, updating it in place or inserting it.

    When inserting, place it before the `before` field if given, else first.
    """
    parts = raw.split("---", 2)
    lines = parts[1].split("\n")
    for i, line in enumerate(lines):
        if line.strip().startswith(f"{key}:"):
            indent = line[: len(line) - len(line.lstrip())]
            lines[i] = f"{indent}{key}: {value}"
            break
    else:
        if before:
            insert_at = next(
                (i for i, l in enumerate(lines) if l.strip().startswith(f"{before}:")),
                len(lines) - 1,
            )
        else:  # before the first non-empty frontmatter line
            insert_at = next(
                (i for i, l in enumerate(lines) if l.strip()), len(lines) - 1
            )
        lines.insert(insert_at, f"{key}: {value}")
    parts[1] = "\n".join(lines)
    return "---".join(parts)


def apply_reading_time(path: Path) -> tuple[int, bool]:
    """Compute and persist readingTime in the frontmatter. Returns (minutes, changed)."""
    raw = path.read_text(encoding="utf-8")
    parsed = parse_frontmatter(raw)
    if parsed is None:
        return 0, False
    minutes = reading_time_minutes(parsed[1])
    new_raw = upsert_field(raw, "readingTime", minutes, before="isDraft")
    changed = new_raw != raw
    if changed:
        path.write_text(new_raw, encoding="utf-8")
    return minutes, changed


def assign_ids(files: list[Path]) -> list[tuple[Path, str, int]]:
    """Ensure every file has a unique, autoincremental id. Files with a valid,
    non-colliding id keep it; missing/duplicate/non-numeric ids get max+1.
    Writes changed files and returns (path, old_id, new_id) for each change.
    """
    records = []
    for path in files:
        raw = path.read_text(encoding="utf-8")
        parsed = parse_frontmatter(raw)
        current = parsed[0].get("id") if parsed else None
        records.append((path, raw, current))

    used: set[int] = set()
    pending: list[int] = []
    for i, (_, _, current) in enumerate(records):
        if current is not None and current.lstrip("-").isdigit() and int(current) not in used:
            used.add(int(current))
        else:
            pending.append(i)

    next_id = max(used) + 1 if used else 1
    changes: list[tuple[Path, str, int]] = []
    for i in pending:
        while next_id in used:
            next_id += 1
        path, raw, current = records[i]
        used.add(next_id)
        path.write_text(upsert_field(raw, "id", next_id), encoding="utf-8")
        changes.append((path, current or "∅", next_id))
        next_id += 1
    return changes


def validate(path: Path, categories: list[str], allow: set[str]) -> tuple[list[str], list[str]]:
    """Return (errors, warnings) for a single file. Errors break the Astro build;
    warnings are convention issues that don't."""
    errors: list[str] = []
    warnings: list[str] = []
    raw = path.read_text(encoding="utf-8")
    parsed = parse_frontmatter(raw)
    if parsed is None:
        return ["missing or malformed frontmatter (--- ... ---)"], []
    fields, body = parsed

    for field in REQUIRED_FIELDS:
        if field not in fields:
            errors.append(f"missing required field '{field}'")

    if "id" in fields and not fields["id"].lstrip("-").isdigit():
        errors.append(f"id must be a number, got '{fields['id']}'")

    if "slug" in fields:
        slug = fields["slug"]
        if len(slug) > 50:
            errors.append(f"slug exceeds 50 chars ({len(slug)})")
        if not SLUG_RE.match(slug):
            warnings.append(f"slug '{slug}' is not kebab-case")
        if slug != path.stem:
            warnings.append(f"slug '{slug}' does not match filename '{path.stem}'")

    if "title" in fields and len(fields["title"]) > 50:
        errors.append(f"title exceeds 50 chars ({len(fields['title'])})")

    if "publishedDate" in fields:
        try:
            date.fromisoformat(fields["publishedDate"])
        except ValueError:
            errors.append(f"publishedDate must be YYYY-MM-DD, got '{fields['publishedDate']}'")

    if "category" in fields and fields["category"] not in categories:
        errors.append(f"category '{fields['category']}' not in {categories}")

    if "readingTime" in fields and not fields["readingTime"].isdigit():
        errors.append(f"readingTime must be a number, got '{fields['readingTime']}'")

    if "isDraft" in fields and fields["isDraft"] not in ("true", "false"):
        errors.append(f"isDraft must be true/false, got '{fields['isDraft']}'")

    if not body:
        errors.append("body is empty")

    warnings.extend(spell_check(raw, allow))

    return errors, warnings


def main() -> int:
    if not BLOG_DIR.is_dir():
        sys.exit(f"ERROR: blog dir not found: {BLOG_DIR}")

    removed = clean_appledouble()
    if removed:
        print(f"{AMBER}🧹 Removed {removed} macOS AppleDouble (._*) file(s).{RESET}\n")

    categories = load_categories()
    allow = load_allowlist()
    files = sorted(p for p in BLOG_DIR.rglob("*.md") if not p.name.startswith("._"))
    if not files:
        print("No markdown files found.")
        return 0

    if get_speller() is False:
        print(f"{AMBER}⚠️  wordfreq not installed; spell check skipped. "
              f"Run: .venv/bin/pip install wordfreq{RESET}\n")

    for path, old, new in assign_ids(files):
        rel = path.relative_to(ROOT)
        print(f"{GREEN}🔢 {rel}: id {old} → {new}{RESET}")

    total_errors = 0
    total_warnings = 0
    seen_ids: dict[str, Path] = {}
    seen_slugs: dict[str, Path] = {}

    for path in files:
        rel = path.relative_to(ROOT)
        minutes, changed = apply_reading_time(path)
        errors, warnings = validate(path, categories, allow)

        parsed = parse_frontmatter(path.read_text(encoding="utf-8"))
        if parsed:
            fields = parsed[0]
            for key, store in (("id", seen_ids), ("slug", seen_slugs)):
                value = fields.get(key)
                if value and value in store:
                    errors.append(f"duplicate {key} '{value}' (also in {store[value].name})")
                elif value:
                    store[value] = path

        total_errors += len(errors)
        total_warnings += len(warnings)

        if errors:
            print(f"\n{RED}❌ {rel}{RESET}")
        elif warnings:
            print(f"\n{AMBER}⚠️  {rel}{RESET}")
        else:
            print(f"{GREEN}✅ {rel}{RESET}")

        for err in errors:
            print(f"    {RED}- {err}{RESET}")
        for warn in warnings:
            print(f"    {AMBER}- {warn}{RESET}")
        note = "updated" if changed else "unchanged"
        print(f"    {GREEN}- readingTime: {minutes} min ({note}){RESET}")

    print()
    if total_errors:
        print(f"{RED}❌ {total_errors} error(s){RESET}, {AMBER}{total_warnings} warning(s){RESET}.")
        return 1
    if total_warnings:
        print(f"{AMBER}⚠️  {total_warnings} warning(s){RESET}, no errors.")
        return 0
    print(f"{GREEN}✅ All {len(files)} file(s) valid.{RESET}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
