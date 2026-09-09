#!/usr/bin/env python3
"""No-key Case Room launcher (Python 3.9+, Node >=22.13.0).

Repository resolution never depends on this script's installed location:
  --repo REPO_ROOT, then CASE_ROOM_CHECKOUT, then setup's managed current.json.
Explicit repositories are validated but never cloned, installed, or updated.
Only setup uses the network/installs dependencies; it requires a full commit SHA.
Commands execute in REPO_ROOT/case-room, so use absolute decision/export paths.
No model API credentials are required, inspected, printed, or created.

Examples:
  python3 case_room.py --repo /path/to/dr-house-in-house status --run RUN_ID
  python3 case_room.py setup --ref EXACT_40_HEX_COMMIT
  python3 case_room.py start --case night-shift --run-id my-run
  python3 case_room.py pending --run my-run
  python3 case_room.py resume --run my-run --decision /absolute/decision.json
  python3 case_room.py export --run my-run --out /absolute/run.json
  python3 case_room.py render --input /absolute/run.json --output /absolute/replay.html
  python3 case_room.py test
  python3 case_room.py typecheck
  python3 case_room.py build

Put --repo BEFORE the command. Remaining arguments are forwarded as separate
argv values without shell interpolation (an initial separator -- is removed).
The selected repository's npm scripts are executable code: trust explicit repos.
Setup runs npm ci, including package lifecycle scripts; no npm install fallback.
Failed setup leaves its new path for inspection and never overwrites it on retry.
"""

import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

REMOTE = "https://github.com/Laksh-star/dr-house-in-house.git"
PACKAGE_NAME = "case-room-external-decision"
OWNER = "mastra-case-room-helper/v1"
MIN_NODE = (22, 13, 0)
COMMANDS = {
    **{name: ["npm", "run", "cli", "--", name]
       for name in ("start", "pending", "status", "resume", "export")},
    **{name: ["npm", "run", name, "--"]
       for name in ("test", "typecheck", "build")},
    "render": ["node", "scripts/render-replay.mjs"],
}


class HelperError(Exception):
    pass


def run(argv, cwd=None, capture=False):
    """No shell; subprocess output is inherited unless explicitly captured."""
    try:
        result = subprocess.run(argv, cwd=cwd, text=True, check=False,
                                stdout=subprocess.PIPE if capture else None,
                                stderr=subprocess.PIPE if capture else None)
    except FileNotFoundError as exc:
        raise HelperError(f"Required executable not found: {argv[0]}") from exc
    if result.returncode:
        detail = (result.stderr or "").strip() if capture else "see subprocess output above"
        raise HelperError(f"{argv[0]} failed (exit {result.returncode}): {detail}")
    return result.stdout.strip() if capture else None


def check_node():
    version = run(["node", "--version"], capture=True)
    match = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)(?:\+[^\s]+)?", version)
    if not match or tuple(map(int, match.groups())) < MIN_NODE:
        raise HelperError(f"Node >=22.13.0 (stable) required; found {version!r}")


def validate_repo(repo):
    repo = Path(repo).expanduser().resolve()
    package = repo / "case-room" / "package.json"
    try:
        data = json.loads(package.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise HelperError(f"Cannot read valid package.json at {package}: {exc}") from exc
    if not isinstance(data, dict) or data.get("name") != PACKAGE_NAME:
        raise HelperError(f"Expected package name {PACKAGE_NAME!r} in {package}")
    return repo


def cache_root():
    return Path.home() / ".cache" / "mastra-case-room"


def read_record(path):
    if path.is_symlink():
        raise HelperError(f"Refusing symlink metadata: {path}")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise HelperError(f"Cannot read managed metadata {path}: {exc}") from exc
    if (not isinstance(data, dict) or data.get("owner") != OWNER
            or data.get("remote") != REMOTE
            or not isinstance(data.get("ref"), str)
            or not re.fullmatch(r"[0-9a-f]{40}", data["ref"])):
        raise HelperError(f"Not this helper's managed metadata; refusing {path}")
    expected = cache_root() / "checkouts" / data["ref"]
    if data.get("path") != str(expected):
        raise HelperError(f"Unexpected checkout path in {path}")
    return data


def git(repo, *args):
    return run(["git", "-c", "protocol.file.allow=never", "-c",
                "protocol.ext.allow=never", "-C", str(repo), *args], capture=True)


def verify_managed(data):
    repo = Path(data["path"])
    # Reject relocated/symlinked managed directories, including cache parents.
    if repo.resolve() != repo.absolute() or not (repo / ".git").is_dir():
        raise HelperError(f"Managed checkout missing, symlinked, or not a clone: {repo}")
    if git(repo, "remote", "get-url", "--all", "origin").splitlines() != [REMOTE]:
        raise HelperError(f"Managed origin must be exactly {REMOTE}")
    if git(repo, "rev-parse", "--verify", "HEAD") != data["ref"]:
        raise HelperError("Managed HEAD differs from pinned commit; refusing to switch or update it")
    return validate_repo(repo)


def select_repo(explicit):
    chosen = explicit or os.environ.get("CASE_ROOM_CHECKOUT")
    if chosen:
        repo = validate_repo(chosen)
        managed_parent = (cache_root() / "checkouts").resolve()
        if repo.parent == managed_parent:
            record = read_record(cache_root() / "records" / (repo.name + ".json"))
            return verify_managed(record)
        return repo
    current = cache_root() / "current.json"
    if not current.exists():
        raise HelperError("No checkout configured. Pass --repo REPO_ROOT, set CASE_ROOM_CHECKOUT, "
                          "or run setup --ref EXACT_40_HEX_COMMIT")
    data = read_record(current)
    record = read_record(cache_root() / "records" / (data["ref"] + ".json"))
    if record != data:
        raise HelperError("Managed current pointer and checkout record disagree")
    return verify_managed(data)


def save_current(data):
    path = cache_root() / "current.json"
    if path.exists() or path.is_symlink():
        read_record(path)  # Never replace unrelated or malformed metadata.
    fd, temporary = tempfile.mkstemp(prefix=".current-", suffix=".json", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, indent=2)
            handle.write("\n")
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def setup(ref):
    if not re.fullmatch(r"[0-9a-fA-F]{40}", ref):
        raise HelperError("setup --ref requires an exact 40-character hexadecimal commit, not a branch/tag")
    ref = ref.lower()
    check_node()
    root = cache_root()
    if root.resolve() != root.absolute():
        raise HelperError(f"Refusing symlinked managed cache: {root}")
    for directory in (root, root / "checkouts", root / "records"):
        if directory.is_symlink():
            raise HelperError(f"Refusing symlinked cache directory: {directory}")
        directory.mkdir(parents=True, exist_ok=True)
    current = root / "current.json"
    if current.exists() or current.is_symlink():
        read_record(current)
    target = root / "checkouts" / ref
    record_path = root / "records" / (ref + ".json")
    data = {"owner": OWNER, "remote": REMOTE, "ref": ref, "path": str(target)}
    if target.exists() or target.is_symlink():
        if not record_path.exists():
            raise HelperError(f"Checkout path already exists without a managed record; refusing {target}")
        existing = read_record(record_path)
        if existing != data:
            raise HelperError("Existing managed checkout metadata differs")
        verify_managed(existing)
        # Idempotent setup never switches or reinstalls an existing checkout.
        save_current(existing)
        print(json.dumps({"checkout": str(target), "ref": ref, "reused": True}))
        return
    if record_path.exists() or record_path.is_symlink():
        raise HelperError(f"Record exists without checkout; refusing to overwrite {record_path}")
    # Exclusive mkdir prevents cloning into a pre-existing unrelated directory.
    target.mkdir(exist_ok=False)
    print(f"Cloning pinned public repository into {target}; setup needs network access.", file=sys.stderr)
    run(["git", "-c", "protocol.file.allow=never", "-c", "protocol.ext.allow=never",
         "clone", "--no-checkout", "--depth", "1", "--", REMOTE, str(target)])
    if git(target, "remote", "get-url", "--all", "origin").splitlines() != [REMOTE]:
        raise HelperError("Clone origin differs from authorized URL")
    git(target, "fetch", "--depth", "1", "origin", ref)
    if git(target, "rev-parse", "--verify", ref + "^{commit}") != ref:
        raise HelperError("Fetched object is not the exact requested commit")
    git(target, "checkout", "--detach", ref)
    verify_managed(data)
    run(["npm", "ci"], cwd=target / "case-room")
    verify_managed(data)
    with record_path.open("x", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
        handle.write("\n")
    save_current(data)
    print(json.dumps({"checkout": str(target), "ref": ref, "reused": False}))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", help="Existing repository root; place before command (no clone/install)")
    parser.add_argument("command", choices=["setup", *COMMANDS])
    parser.add_argument("arguments", nargs=argparse.REMAINDER, help="Arguments forwarded verbatim")
    args = parser.parse_args(argv)
    rest = args.arguments[1:] if args.arguments[:1] == ["--"] else args.arguments
    if args.command == "setup":
        if args.repo:
            parser.error("--repo cannot be combined with setup")
        sub = argparse.ArgumentParser(prog=parser.prog + " setup", description="Explicit pinned clone and npm ci; network required")
        sub.add_argument("--ref", required=True, help="Exact 40-character commit SHA; no branch/latest default")
        setup(sub.parse_args(rest).ref)
    else:
        repo = select_repo(args.repo)
        check_node()
        command = COMMANDS[args.command] + rest
        # Preserve the actual command exit status; never install missing dependencies.
        result = subprocess.run(command, cwd=repo / "case-room", check=False)
        if result.returncode:
            print(f"case_room: {args.command} failed (exit {result.returncode})", file=sys.stderr)
        return result.returncode if result.returncode >= 0 else 128 - result.returncode
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (HelperError, OSError) as exc:
        print(f"case_room: {exc}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("case_room: interrupted", file=sys.stderr)
        sys.exit(130)
