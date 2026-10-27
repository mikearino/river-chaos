import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / ".platform/generate_realip.py"
spec = importlib.util.spec_from_file_location("realip", SCRIPT)
realip = importlib.util.module_from_spec(spec)
spec.loader.exec_module(realip)


def feed():
    return {"syncToken": "1234567890", "createDate": "2026-10-26-12-00-00",
            "prefixes": [{"service": "CLOUDFRONT_ORIGIN_FACING", "region": "GLOBAL", "ip_prefix": "13.32.0.0/24"},
                         {"service": "EC2", "region": "GLOBAL", "ip_prefix": "3.0.0.0/8"}],
            "ipv6_prefixes": [{"service": "CLOUDFRONT_ORIGIN_FACING", "region": "GLOBAL", "ipv6_prefix": "2600:9000::/32"}]}


class GeneratorTests(unittest.TestCase):
    def test_only_official_origin_facing_ipv4_ipv6_selected(self):
        output = realip.render(json.dumps(feed()))
        self.assertIn("real_ip_recursive off;", output)
        self.assertIn("real_ip_header X-Forwarded-For;", output)
        self.assertIn("set_real_ip_from 13.32.0.0/24;", output)
        self.assertIn("set_real_ip_from 2600:9000::/32;", output)
        self.assertNotIn("set_real_ip_from 3.0.0.0/8;", output)

    def test_regional_origin_facing_ranges_are_included(self):
        data = feed(); data["prefixes"][0]["region"] = "us-east-1"
        self.assertIn("set_real_ip_from 13.32.0.0/24;", realip.render(json.dumps(data)))

    def test_one_address_family_is_sufficient(self):
        for section in ["prefixes", "ipv6_prefixes"]:
            data = feed(); data[section] = []
            self.assertIn("set_real_ip_from", realip.render(json.dumps(data)))

    def test_invalid_empty_or_injectable_data_rejected(self):
        cases = [b"not json", b"{}", b"[]"]
        for field, value in [("syncToken", "1\ninclude /tmp/evil;"), ("createDate", "bad"),
                             ("prefixes", {}), ("ipv6_prefixes", None)]:
            data = feed(); data[field] = value; cases.append(json.dumps(data))
        data = feed(); data["prefixes"] = []; data["ipv6_prefixes"] = []; cases.append(json.dumps(data))
        for cidr in ["0.0.0.0/0", "127.0.0.0/8", "10.0.0.0/8", "224.0.0.0/4", "13.32.0.1/24", "13.32.0.0/24; include /tmp/evil;", "2600:9000::/32", "13.32.0.1", 219152384]:
            data = feed(); data["prefixes"][0]["ip_prefix"] = cidr; cases.append(json.dumps(data))
        data = feed(); data["prefixes"][0]["region"] = ""; cases.append(json.dumps(data))
        for data in cases:
            with self.subTest(data=data), self.assertRaises((ValueError, KeyError, TypeError)):
                realip.render(data)

    def test_failed_fetch_or_validation_never_replaces_existing_config(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "realip.conf"; destination.write_text("last-known-good")
            for fetch in [lambda: b"bad json", lambda: (_ for _ in ()).throw(TimeoutError())]:
                with self.assertRaises((ValueError, TimeoutError)):
                    realip.generate(destination, fetch)
                self.assertEqual(destination.read_text(), "last-known-good")
            destination.unlink()
            with self.assertRaises(ValueError):
                realip.generate(destination, lambda: b"bad json")
            self.assertFalse(destination.exists())

    def test_successful_write_is_complete_and_leaves_no_temp_files(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory) / "realip.conf"
            realip.generate(destination, lambda: json.dumps(feed()))
            self.assertIn("set_real_ip_from", destination.read_text())
            self.assertEqual(list(Path(directory).iterdir()), [destination])

    def test_download_timeout_size_status_and_redirect_checks(self):
        with patch.object(realip.urllib.request, "build_opener") as opener:
            response = opener.return_value.open.return_value.__enter__.return_value
            response.status = 200; response.read.return_value = b"data"
            self.assertEqual(realip.download(), b"data")
            opener.return_value.open.assert_called_with(realip.URL, timeout=10)
            response.read.assert_called_with(realip.MAX_BYTES + 1)
            response.read.return_value = b"x" * (realip.MAX_BYTES + 1)
            with self.assertRaises(ValueError): realip.download()
            response.status = 503
            with self.assertRaises(ValueError): realip.download()
            opener.return_value.open.side_effect = TimeoutError()
            with self.assertRaises(TimeoutError): realip.download()
        with self.assertRaises(ValueError):
            realip.NoRedirect().redirect_request(None, None, 302, "", {}, "http://untrusted/")

    def test_both_prebuild_hooks_call_shared_generator(self):
        root = SCRIPT.parent
        application = (root / "hooks/prebuild/10-cloudfront-realip.sh").read_text()
        configuration = (root / "confighooks/prebuild/10-cloudfront-realip.sh").read_text()
        self.assertEqual(application, configuration)
        self.assertIn('exec python3 "$APP_ROOT/.platform/generate_realip.py"', application)
        self.assertIn('set -euo pipefail', application)
