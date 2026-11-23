import hashlib
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(__file__))
from build_latest_json import build


class BuildLatestJsonTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.sigs = self.dir.name

    def tearDown(self):
        self.dir.cleanup()

    def sig(self, name: str, content: str = "SIGNATURE") -> None:
        with open(os.path.join(self.sigs, name), "w", encoding="utf-8") as handle:
            handle.write(content)

    def test_windows_msi_and_nsis(self):
        self.sig("VGC.Reporter_0.5.0_x64_en-US.msi.sig")
        self.sig("VGC.Reporter_0.5.0_x64-setup.exe.sig")
        data = build(self.sigs, "v0.5.0.20261121-beta", "notes", "https://example.test/repo", "2026-11-21T00:00:00.000Z")
        self.assertEqual(data["version"], "0.5.0")
        self.assertIn("windows-x86_64", data["platforms"])
        self.assertIn("windows-x86_64-nsis", data["platforms"])

    def test_macos_arches_are_separate(self):
        self.sig("VGC.Reporter_0.5.0_darwin_aarch64.app.tar.gz.sig")
        self.sig("VGC.Reporter_0.5.0_darwin_x64.app.tar.gz.sig")
        data = build(self.sigs, "v0.5.0", "notes", "https://example.test/repo", "2026-11-21T00:00:00.000Z")
        self.assertIn("darwin-aarch64", data["platforms"])
        self.assertIn("darwin-x86_64", data["platforms"])
        self.assertNotEqual(
            data["platforms"]["darwin-aarch64"]["url"],
            data["platforms"]["darwin-x86_64"]["url"],
        )

    def test_linux_and_android(self):
        self.sig("VGC.Reporter_0.5.0_amd64.AppImage.sig")
        self.sig("VGC.Reporter_0.5.0_amd64.deb.sig")
        self.sig("VGC.Reporter-0.5.0-1.x86_64.rpm.sig")
        self.sig("VGC.Reporter_v0.5.0_android.apk.sig")
        data = build(self.sigs, "v0.5.0", "notes", "https://example.test/repo", "2026-11-21T00:00:00.000Z")
        self.assertIn("linux-x86_64", data["platforms"])
        self.assertIn("linux-x86_64-deb", data["platforms"])
        self.assertIn("linux-x86_64-rpm", data["platforms"])
        self.assertIn("android", data["platforms"])

    def test_android_manifest_carries_apk_size_and_sha256(self):
        self.sig("VGC.Reporter_v0.6.2_android.apk.sig")
        asset = os.path.join(self.sigs, "VGC.Reporter_v0.6.2_android.apk")
        with open(asset, "wb") as handle:
            handle.write(b"apk-bytes")
        data = build(
            self.sigs,
            "v0.6.2.20261122-beta",
            "notes",
            "https://example.test/repo",
            "2026-11-22T00:00:00.000Z",
            self.sigs,
        )
        android = data["platforms"]["android"]
        self.assertEqual(android["size"], len(b"apk-bytes"))
        self.assertEqual(
            android["sha256"],
            hashlib.sha256(b"apk-bytes").hexdigest(),
        )
        self.assertIn("VGC.Reporter_v0.6.2_android.apk", android["url"])

    def test_signature_is_not_double_encoded(self):
        self.sig("VGC.Reporter_0.5.0_x64_en-US.msi.sig", "abc123")
        data = build(self.sigs, "v0.5.0", "notes", "https://example.test/repo", "2026-11-21T00:00:00.000Z")
        self.assertEqual(data["platforms"]["windows-x86_64"]["signature"], "abc123")

    def test_empty_raises(self):
        with self.assertRaises(SystemExit):
            build(self.sigs, "v0.5.0", "notes", "https://example.test/repo", "2026-11-21T00:00:00.000Z")


if __name__ == "__main__":
    unittest.main()
