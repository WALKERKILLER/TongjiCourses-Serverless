import argparse
import json
import os
import pathlib
import sys

try:
    import requests
except Exception as e:
    print("Missing python dependency: requests")
    print(str(e))
    print("Install:")
    print("  python -m pip install requests")
    raise SystemExit(1)


def read_dev_vars(dev_vars_path: pathlib.Path) -> dict:
    if not dev_vars_path.exists():
        return {}
    out: dict[str, str] = {}
    for raw in dev_vars_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v
    return out


def cookie_header_from_session(session) -> str:
    items = session.cookies.get_dict()
    return "; ".join([f"{k}={v}" for k, v in items.items()])


def main() -> int:
    parser = argparse.ArgumentParser(description="Login to Onesystem (pk crawler) then trigger local /api/admin/pk/sync")
    parser.add_argument("--base-url", default="http://127.0.0.1:8787", help="Backend base url")
    parser.add_argument("--calendarId", "--calendar", dest="calendar_id", type=int, required=True, help="Calendar id, e.g. 121")
    parser.add_argument("--depth", type=int, default=1, help="Sync depth")
    parser.add_argument(
        "--config",
        default=str(pathlib.Path(__file__).resolve().parents[1] / "config.onesystem.ini"),
        help="Path to config.ini used by pk crawler login",
    )
    args = parser.parse_args()

    repo_root = pathlib.Path(__file__).resolve().parents[3]
    pk_crawler_dir = repo_root / "pk" / "crawler"
    if not pk_crawler_dir.exists():
        print(f"Cannot find pk crawler at: {pk_crawler_dir}")
        return 1

    config_path = pathlib.Path(args.config).resolve()
    if not config_path.exists():
        print("Missing config file for login.")
        print(f"Expected: {config_path}")
        print("Create it based on: main/backend/config.onesystem.example.ini (DO NOT COMMIT secrets)")
        return 1

    # pk crawler utilities read config.ini from current working directory
    os.chdir(str(config_path.parent))
    if config_path.name != "config.ini":
        # The pk utils hard-code 'config.ini'. Always refresh a copy next to it.
        tmp = config_path.parent / "config.ini"
        try:
            content = config_path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            content = config_path.read_text(encoding="gbk")
        tmp.write_text(content, encoding="utf-8")

    sys.path.insert(0, str(pk_crawler_dir))

    try:
        from utils import loginout  # type: ignore
    except Exception as e:
        print("Failed to import pk crawler login utilities.")
        print(str(e))
        print("You may need to install python deps used by pk crawler (requests, pycryptodome, etc).")
        print("Install:")
        print("  python -m pip install pycryptodome")
        print("  python -m pip install beautifulsoup4")
        return 1

    session = loginout.login()
    if session is None:
        print("Login failed.")
        return 1

    onesystem_cookie = cookie_header_from_session(session)
    if not onesystem_cookie:
        print("Login succeeded but no cookies were captured.")
        return 1

    dev_vars = read_dev_vars((repo_root / "main" / "backend" / ".dev.vars"))
    admin_secret = dev_vars.get("ADMIN_SECRET", "").strip() or os.environ.get("ADMIN_SECRET", "").strip()
    if not admin_secret:
        print("Missing ADMIN_SECRET. Set it in main/backend/.dev.vars or environment.")
        return 1

    url = args.base_url.rstrip("/") + "/api/admin/pk/sync"
    res = requests.post(
        url,
        headers={"x-admin-secret": admin_secret, "content-type": "application/json"},
        data=json.dumps({"calendarId": args.calendar_id, "depth": args.depth, "onesystemCookie": onesystem_cookie}),
        timeout=120,
    )
    if res.status_code >= 400:
        print(f"Sync failed: HTTP {res.status_code}")
        print(res.text[:2000])
        return 1

    print(res.text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
