#!/usr/bin/env python3
"""Read-only Mastra GitHub release check; Python 3.9+ stdlib, no credentials.

  python3 check_mastra_release.py
  python3 check_mastra_release.py --current @mastra/core@1.64.0
  python3 check_mastra_release.py --current 1.64.0

Requests https://api.github.com/repos/mastra-ai/mastra/releases/latest with a
30-second timeout. Does not install packages, edit files, or check npm registry
versions. A monorepo GitHub release tag is NOT necessarily @mastra/core's version.
"""

import argparse
import json
import sys
import urllib.error
import urllib.request

URL = "https://api.github.com/repos/mastra-ai/mastra/releases/latest"
DEFAULT_CURRENT = "@mastra/core@1.64.0"


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--current", default=DEFAULT_CURRENT,
                        help="Installed/pinned package label or version (default: %(default)s)")
    args = parser.parse_args(argv)
    if not args.current.strip():
        parser.error("--current must not be empty")
    request = urllib.request.Request(URL, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "mastra-case-room-release-check/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
    })
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            release = json.load(response)
        if not isinstance(release, dict) or not all(
                isinstance(release.get(key), str) and release[key]
                for key in ("tag_name", "published_at", "html_url")):
            raise ValueError("GitHub response lacks release tag, publication date, or URL")
    except (urllib.error.URLError, OSError, ValueError) as exc:
        print(f"check_mastra_release: cannot read latest public GitHub release: {exc}", file=sys.stderr)
        return 1
    print(json.dumps({
        "current": args.current,
        "latest": {"tag": release["tag_name"], "published_at": release["published_at"],
                   "url": release["html_url"]},
        "comparison": {
            "exact_label_match": args.current == release["tag_name"],
            "update_available": None,
            "note": "GitHub monorepo release tags do not establish npm package versions or compatibility. "
                    "No registry lookup, installation, or file edits performed.",
        },
        "source": URL,
    }, indent=2))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("check_mastra_release: interrupted", file=sys.stderr)
        sys.exit(130)
