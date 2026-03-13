#!/usr/bin/env python3
"""Sync publication metadata from a Google Scholar profile.

This script fetches publication rows from Google Scholar and stores a local JSON file
that can be rendered by a static site.
"""

from __future__ import annotations

import argparse
import json
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import List
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen

BASE_URL = "https://scholar.google.com/citations"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)

ROW_RE = re.compile(r'<tr class="gsc_a_tr">(.*?)</tr>', re.S)
TITLE_RE = re.compile(r'<a href="([^"]+)" class="gsc_a_at">(.*?)</a>', re.S)
GRAY_RE = re.compile(r'<div class="gs_gray">(.*?)</div>', re.S)
CITED_CELL_RE = re.compile(r'<td class="gsc_a_c">(.*?)</td>', re.S)
CITED_NUM_RE = re.compile(r'class="gsc_a_ac[^\"]*">(\d+)</a>')
YEAR_RE = re.compile(r'<td class="gsc_a_y">.*?>(\d{4})<', re.S)


@dataclass
class Publication:
    title: str
    authors: str
    venue: str
    year: int | None
    citations: int
    scholar_url: str
    verified: bool


def strip_tags(text: str) -> str:
    cleaned = re.sub(r"<[^>]+>", "", text)
    cleaned = unescape(cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def fetch_html(user_id: str, start: int, pagesize: int, sortby: str) -> str:
    query = urlencode(
        {
            "hl": "en",
            "user": user_id,
            "view_op": "list_works",
            "sortby": sortby,
            "cstart": start,
            "pagesize": pagesize,
        }
    )
    url = f"{BASE_URL}?{query}"
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=20) as response:
        return response.read().decode("utf-8", errors="replace")


def verify_url(url: str) -> bool:
    try:
        request = Request(url, headers={"User-Agent": USER_AGENT})
        with urlopen(request, timeout=20) as response:
            return int(response.status) == 200
    except (HTTPError, URLError, TimeoutError):
        return False


def parse_rows(html_text: str) -> List[Publication]:
    rows = ROW_RE.findall(html_text)
    parsed: List[Publication] = []

    for row_html in rows:
        title_match = TITLE_RE.search(row_html)
        if not title_match:
            continue

        href, raw_title = title_match.groups()
        title = strip_tags(raw_title)
        scholar_url = urljoin("https://scholar.google.com", unescape(href))

        gray_parts = GRAY_RE.findall(row_html)
        authors = strip_tags(gray_parts[0]) if len(gray_parts) >= 1 else ""
        venue = strip_tags(gray_parts[1]) if len(gray_parts) >= 2 else ""

        cited_cell_match = CITED_CELL_RE.search(row_html)
        citations = 0
        if cited_cell_match:
            cited_num_match = CITED_NUM_RE.search(cited_cell_match.group(1))
            if cited_num_match:
                citations = int(cited_num_match.group(1))

        year_match = YEAR_RE.search(row_html)
        year = int(year_match.group(1)) if year_match else None

        parsed.append(
            Publication(
                title=title,
                authors=authors,
                venue=venue,
                year=year,
                citations=citations,
                scholar_url=scholar_url,
                verified=False,
            )
        )

    return parsed


def dedupe_by_url(items: List[Publication]) -> List[Publication]:
    seen = set()
    unique: List[Publication] = []

    for item in items:
        if item.scholar_url in seen:
            continue
        seen.add(item.scholar_url)
        unique.append(item)

    return unique


def sync_publications(
    user_id: str,
    output_path: Path,
    pagesize: int,
    max_pages: int,
    sortby: str,
    verify_links: bool,
) -> dict:
    all_items: List[Publication] = []

    for page_idx in range(max_pages):
        start = page_idx * pagesize
        html_text = fetch_html(user_id=user_id, start=start, pagesize=pagesize, sortby=sortby)
        page_items = parse_rows(html_text)

        if not page_items:
            break

        all_items.extend(page_items)

        if len(page_items) < pagesize:
            break

        time.sleep(0.9)

    unique_items = dedupe_by_url(all_items)

    if verify_links:
        for item in unique_items:
            item.verified = verify_url(item.scholar_url)
            time.sleep(0.2)

    payload = {
        "source": "Google Scholar",
        "scholar_user_id": user_id,
        "profile_url": f"https://scholar.google.com/citations?hl=en&user={user_id}",
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "total_publications": len(unique_items),
        "verified_link_count": sum(1 for item in unique_items if item.verified),
        "items": [
            {
                "title": item.title,
                "authors": item.authors,
                "venue": item.venue,
                "year": item.year,
                "citations": item.citations,
                "scholar_url": item.scholar_url,
                "verified": item.verified,
            }
            for item in unique_items
        ],
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    return payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync Google Scholar publications to local JSON")
    parser.add_argument("--user-id", required=True, help="Google Scholar user ID, e.g. qUMjnPcAAAAJ")
    parser.add_argument(
        "--output",
        default="data/scholar-publications.json",
        help="Path to output JSON file",
    )
    parser.add_argument("--pagesize", type=int, default=100)
    parser.add_argument("--max-pages", type=int, default=3)
    parser.add_argument("--sortby", choices=["pubdate", "title"], default="pubdate")
    parser.add_argument(
        "--skip-verify",
        action="store_true",
        help="Skip checking each Scholar link with an HTTP request",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        payload = sync_publications(
            user_id=args.user_id,
            output_path=Path(args.output),
            pagesize=args.pagesize,
            max_pages=args.max_pages,
            sortby=args.sortby,
            verify_links=not args.skip_verify,
        )
    except (HTTPError, URLError, TimeoutError) as error:
        print(f"[error] Failed to fetch Google Scholar data: {error}")
        return 1

    print(
        f"[ok] Synced {payload['total_publications']} publications "
        f"({payload['verified_link_count']} verified links) to {args.output}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
