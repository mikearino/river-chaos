"""Run on Linux with nginx installed to verify actual nginx real-IP semantics."""
import http.client
import http.server
import json
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import unittest


@unittest.skipUnless(sys.platform.startswith("linux") and shutil.which("nginx"), "requires Linux with nginx installed")
class NginxIntegrationTests(unittest.TestCase):
    def test_trusted_cloudfront_and_untrusted_direct_origin(self):
        class Echo(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                body = json.dumps({"xff": self.headers.get("X-Forwarded-For"), "real": self.headers.get("X-Real-IP")}).encode()
                self.send_response(200); self.end_headers(); self.wfile.write(body)
            def log_message(self, *args): pass

        upstream = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Echo)
        threading.Thread(target=upstream.serve_forever, daemon=True).start()
        self.addCleanup(upstream.server_close); self.addCleanup(upstream.shutdown)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with socket.socket() as reservation:
                reservation.bind(("127.0.0.1", 0)); port = reservation.getsockname()[1]
            # Test-only loopback stand-in for the CloudFront TCP source.
            # Configuration is deliberately at HTTP scope, matching Beanstalk.
            config = f'''daemon off;
pid {root}/nginx.pid;
error_log {root}/error.log;
events {{}}
http {{
  access_log off;
  real_ip_header X-Forwarded-For;
  real_ip_recursive off;
  set_real_ip_from 127.0.0.2/32;
  server {{
    listen 127.0.0.1:{port};
    location / {{
      proxy_pass http://127.0.0.1:{upstream.server_port};
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }}
  }}
}}
'''
            filename = root / "nginx.conf"; filename.write_text(config)
            subprocess.run(["nginx", "-t", "-p", directory + "/", "-c", str(filename)], check=True, capture_output=True)
            process = subprocess.Popen(["nginx", "-p", directory + "/", "-c", str(filename)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try:
                for _ in range(100):
                    try:
                        with socket.create_connection(("127.0.0.1", port), timeout=0.1): break
                    except OSError:
                        if process.poll() is not None: self.fail((root / "error.log").read_text())
                        time.sleep(0.02)
                for source, incoming, expected in [
                    ("127.0.0.2", "127.0.0.1, 198.51.100.1", "198.51.100.1"),
                    ("127.0.0.2", "forged, 2001:db8::1", "2001:db8::1"),
                    ("127.0.0.1", "127.0.0.2, 198.51.100.99", "127.0.0.1"),
                    ("127.0.0.1", None, "127.0.0.1"),
                ]:
                    with self.subTest(source=source, incoming=incoming):
                        client = http.client.HTTPConnection("127.0.0.1", port, timeout=2, source_address=(source, 0))
                        try:
                            headers = {"X-Real-IP": "203.0.113.99"}
                            if incoming is not None: headers["X-Forwarded-For"] = incoming
                            client.request("GET", "/", headers=headers)
                            response = client.getresponse(); self.assertEqual(response.status, 200)
                            data = json.loads(response.read())
                            self.assertEqual(data["real"], expected)
                            self.assertEqual(data["xff"].split(",")[-1].strip(), expected)
                        finally: client.close()
            finally:
                process.terminate()
                try: process.wait(timeout=3)
                except subprocess.TimeoutExpired: process.kill(); process.wait()
