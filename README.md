# Zhouliang Yu Personal Website

This repository contains the source code for https://zhouliang-yu.github.io.

## Main Features

- One-page academic homepage inspired by `sainingxie.com` style.
- Publications rendered from `data/scholar-publications.json`.
- Notion-style blog pages powered by `data/blog-posts.json`.

## Update Publications from Google Scholar

Run:

```bash
./scripts/sync_scholar_publications.py --user-id qUMjnPcAAAAJ --output data/scholar-publications.json
```

This script fetches publication entries directly from Google Scholar and stores:

- title
- authors
- venue
- year
- citations
- Google Scholar `view_citation` link
- link verification status

## Local Preview

```bash
python3 -m http.server 8000
```

Then open:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/blog/index.html`
