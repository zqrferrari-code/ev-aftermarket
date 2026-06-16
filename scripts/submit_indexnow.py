#!/usr/bin/env python3
"""
IndexNow bulk URL submitter
用法: python3 scripts/submit_indexnow.py
部署完成后运行，把 sitemap 里所有 URL 提交给 Bing/IndexNow
"""

import json
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

SITEMAP_URL = "https://evaftermarket.io/sitemap.xml"
HOST = "evaftermarket.io"
KEY = "315d31a271f84033bd69efc269f036ec"
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"
INDEXNOW_API = "https://api.indexnow.org/IndexNow"
BATCH_SIZE = 10000


def fetch_urls_from_sitemap(sitemap_url: str) -> list[str]:
    print(f"Fetching sitemap: {sitemap_url}")
    with urllib.request.urlopen(sitemap_url, timeout=30) as resp:
        content = resp.read()
    root = ET.fromstring(content)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = [loc.text for loc in root.findall(".//sm:loc", ns) if loc.text]
    print(f"Found {len(urls)} URLs")
    return urls


def submit_batch(urls: list[str]) -> int:
    payload = json.dumps({
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls,
    }).encode("utf-8")

    req = urllib.request.Request(
        INDEXNOW_API,
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status


def main():
    urls = fetch_urls_from_sitemap(SITEMAP_URL)

    for i in range(0, len(urls), BATCH_SIZE):
        batch = urls[i:i + BATCH_SIZE]
        print(f"Submitting batch {i // BATCH_SIZE + 1}: {len(batch)} URLs...", end=" ")
        status = submit_batch(batch)
        print(f"HTTP {status} {'✅' if status in (200, 202) else '❌'}")

    print(f"\n✅ Done. {len(urls)} URLs submitted to IndexNow.")


if __name__ == "__main__":
    main()
