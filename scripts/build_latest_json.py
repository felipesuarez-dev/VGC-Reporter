#!/usr/bin/env python3
"""Build the Tauri updater manifest from the .sig files on a release.

The workflow downloads every .sig into a directory and calls this script. It is
pure (files in, JSON out) so the platform mapping is testable without GitHub.
"""
from __future__ import annotations

import argparse
import glob
import hashlib
import json
import os
import re
import urllib.parse
from datetime import datetime, timezone


def sig_text(path: str) -> str:
    # Tauri 2 writes the base64-encoded minisign block as the whole file. Do
    # not re-encode it: the updater decodes it once.
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read().strip()


def url_for(repo_url: str, tag: str, asset: str) -> str:
    return (
        f"{repo_url}/releases/download/"
        f"{urllib.parse.quote(tag, safe='.-')}/"
        f"{urllib.parse.quote(asset, safe='._-')}"
    )


def file_sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def apk_asset(assets_dir: str | None) -> str | None:
    if not assets_dir:
        return None
    matches = [
        path
        for path in glob.glob(os.path.join(assets_dir, "*android*.apk"))
        if not path.endswith(".sig")
    ]
    return sorted(matches)[0] if matches else None


def build(
    sigs_dir: str,
    tag: str,
    body: str,
    repo_url: str,
    pub_date: str | None = None,
    assets_dir: str | None = None,
) -> dict:
    version = tag[1:] if tag.startswith("v") else tag
    semver = re.match(r"^\d+\.\d+\.\d+", version)
    version = semver.group(0) if semver else version
    pub_date = pub_date or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    platforms: dict[str, dict[str, str | int]] = {}

    def add(key: str, path: str, asset_path: str | None = None) -> None:
        binary = (
            os.path.basename(asset_path)
            if asset_path
            else os.path.basename(path)[:-4]
        )
        platforms[key] = {
            "signature": sig_text(path),
            "url": url_for(repo_url, tag, binary),
        }

    msi = sorted(glob.glob(os.path.join(sigs_dir, "*.msi.sig")))
    if msi:
        add("windows-x86_64", msi[0])
        add("windows-x86_64-msi", msi[0])

    nsis = sorted(glob.glob(os.path.join(sigs_dir, "*-setup.exe.sig")))
    if nsis:
        add("windows-x86_64-nsis", nsis[0])

    mac = sorted(glob.glob(os.path.join(sigs_dir, "*.app.tar.gz.sig")))
    seen: set[str] = set()
    for path in mac:
        binary = os.path.basename(path)[:-4]
        match = re.search(r"_(aarch64|x64)\.app", binary)
        if not match:
            continue
        arch = "aarch64" if match.group(1) == "aarch64" else "x86_64"
        add(f"darwin-{arch}", path)
        add(f"darwin-{arch}-app", path)
        seen.add(arch)
    if not seen and mac:
        # Older releases have one arch-less bundle. Reuse it for both, as the
        # previous workflow did; the app still updates (Rosetta on ARM).
        for arch in ("aarch64", "x86_64"):
            add(f"darwin-{arch}", mac[0])
            add(f"darwin-{arch}-app", mac[0])

    appimage = sorted(glob.glob(os.path.join(sigs_dir, "*.AppImage.sig")))
    if appimage:
        add("linux-x86_64", appimage[0])
        add("linux-x86_64-appimage", appimage[0])

    deb = sorted(glob.glob(os.path.join(sigs_dir, "*.deb.sig")))
    if deb:
        add("linux-x86_64-deb", deb[0])

    rpm = sorted(glob.glob(os.path.join(sigs_dir, "*.rpm.sig")))
    if rpm:
        add("linux-x86_64-rpm", rpm[0])

    apk = sorted(glob.glob(os.path.join(sigs_dir, "*android*.apk.sig")))
    if apk:
        asset = apk_asset(assets_dir)
        add("android", apk[0], asset)
        # Android's updater downloads the APK itself, so the manifest carries
        # the exact size and SHA-256 to verify before launching the installer.
        if asset:
            platforms["android"]["size"] = os.path.getsize(asset)
            platforms["android"]["sha256"] = file_sha256(asset)

    if not platforms:
        raise SystemExit("No platform .sig files found — refusing to upload an empty latest.json")
    return {
        "version": version,
        "notes": body,
        "pub_date": pub_date,
        "platforms": platforms,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sigs-dir", required=True)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--body-file", required=True)
    parser.add_argument("--repo-url", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--pub-date", default=None)
    parser.add_argument(
        "--assets-dir",
        default=None,
        help="Directory with release binaries; attaches APK size/sha256.",
    )
    args = parser.parse_args()
    with open(args.body_file, "r", encoding="utf-8") as handle:
        body = handle.read()
    data = build(
        args.sigs_dir,
        args.tag,
        body,
        args.repo_url,
        args.pub_date,
        args.assets_dir,
    )
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2)
    print(f"latest.json built — platforms: {sorted(data['platforms'])}")


if __name__ == "__main__":
    main()
