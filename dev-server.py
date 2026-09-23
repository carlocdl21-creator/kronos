#!/usr/bin/env python3
"""
Server di sviluppo per KRONOS.

Fa la stessa cosa di `python3 -m http.server`, ma dice al browser di non
tenere niente in cache. Senza questo, Safari e Chrome si conservano i
moduli JavaScript già scaricati e le modifiche non si vedono finché non
si ricarica tenendo premuto Shift.

    python3 dev-server.py [porta]        # porta predefinita: 8099
"""

import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class SenzaCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def send_header(self, keyword, value):
        # niente Last-Modified: è quello che fa rispondere 304 al posto del file
        if keyword.lower() == "last-modified":
            return
        super().send_header(keyword, value)


if __name__ == "__main__":
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"KRONOS in ascolto su http://localhost:{porta}  (Ctrl+C per fermare)")
    try:
        ThreadingHTTPServer(("", porta), SenzaCache).serve_forever()
    except KeyboardInterrupt:
        print("\nfermato.")
