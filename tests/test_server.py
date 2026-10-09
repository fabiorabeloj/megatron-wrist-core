import http.client
import importlib.util
import threading
import unittest
from pathlib import Path
from http.server import ThreadingHTTPServer

spec = importlib.util.spec_from_file_location(
    "wrist_server", Path(__file__).resolve().parents[1] / "serve_local.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), module.Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def request(self, path, method="GET"):
        conn = http.client.HTTPConnection(*self.server.server_address, timeout=2)
        try:
            conn.request(method, path)
            response = conn.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            conn.close()

    def test_index_and_javascript_are_served(self):
        status, headers, body = self.request("/")
        self.assertEqual(status, 200)
        self.assertIn(b'command-form', body)
        status, headers, _ = self.request("/src/app.mjs")
        self.assertEqual(status, 200)
        self.assertTrue(headers["Content-Type"].startswith("text/javascript"))

    def test_private_paths_and_traversal_are_denied(self):
        for path in ("/.git/config", "/README.md", "/serve_local.py",
                     "/../README.md", "/%2e%2e/README.md", "/api/watch/status"):
            with self.subTest(path=path):
                status, _, _ = self.request(path)
                self.assertEqual(status, 404)

    def test_head_has_no_body(self):
        status, headers, body = self.request("/styles.css", "HEAD")
        self.assertEqual(status, 200)
        self.assertGreater(int(headers["Content-Length"]), 0)
        self.assertEqual(body, b"")

if __name__ == "__main__":
    unittest.main()
