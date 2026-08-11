import os
import urllib.request
from flask import Flask, send_from_directory, request, render_template

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKS_DIR = os.path.join(BASE_DIR, "works")
CDN_BASE = "https://creation.bcmcdn.com/neko/web/release/"

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/<path:filename>")
def static_files(filename):
    if filename == "main.b0815b57.js":
        resp = send_from_directory(BASE_DIR, filename)
        resp.headers["Cache-Control"] = "no-store, must-revalidate"
        return resp
    if os.path.exists(os.path.join(BASE_DIR, filename)):
        return send_from_directory(BASE_DIR, filename)
    if filename.startswith("works/"):
        return send_from_directory(WORKS_DIR, filename[len("works/"):])
    return proxy_cdn(filename)


@app.route("/api/ping")
def ping():
    return {"ok": True}


def proxy_cdn(path):
    url = CDN_BASE + path
    try:
        req = urllib.request.Request(url, headers={"User-Agent": request.headers.get("User-Agent", "")})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
            content_type = resp.headers.get("Content-Type", "application/octet-stream")
        return data, resp.status, {"Content-Type": content_type}
    except Exception as e:
        return {"error": str(e)}, 502


@app.after_request
def add_cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "*"
    return resp


if __name__ == "__main__":
    os.makedirs(WORKS_DIR, exist_ok=True)
    print("Works dir:", WORKS_DIR)
    print("Open: http://127.0.0.1:5000/?f=http://127.0.0.1:5000/works/demo.bcm")
    app.run(host="0.0.0.0", port=5000, debug=False)