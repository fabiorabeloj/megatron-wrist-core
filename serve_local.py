#!/usr/bin/env python3
"""Serve the standalone prototype on 127.0.0.1. No gateway or API proxy."""
from __future__ import annotations

import argparse
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
ASSETS = {
    "/": "index.html",
    "/index.html": "index.html",
    "/styles.css": "styles.css",
    "/src/app.mjs": "src/app.mjs",
    "/src/orb.mjs": "src/orb.mjs",
    "/src/policy.mjs": "src/policy.mjs",
    "/src/session.mjs": "src/session.mjs",
}

class Handler(BaseHTTPRequestHandler):
    server_version = "WristCore/0.1"

    def do_GET(self):
        self._serve(send_body=True)

    def do_HEAD(self):
        self._serve(send_body=False)

    def _serve(self, *, send_body):
        rel = ASSETS.get(urlsplit(self.path).path)
        if rel is None:
            self.send_error(404, "Not found")
            return
        target = ROOT / rel
        if not target.is_file():
            self.send_error(404, "Not found")
            return
        data = target.read_bytes()
        mime = "text/javascript" if target.suffix == ".mjs" else (
            mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        )
        self.send_response(200)
        self.send_header("Content-Type", mime + "; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        if send_body:
            self.wfile.write(data)

def main():
    parser = argparse.ArgumentParser(description="Local Wrist Core prototype")
    parser.add_argument("--port", type=int, default=8788)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"Wrist Core: http://127.0.0.1:{args.port}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == "__main__":
    main()
