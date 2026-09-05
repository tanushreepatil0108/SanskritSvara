const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = ROOT;
const DATA = ROOT;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg"
};

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-cache"
  });
  res.end(body);
}

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function safeDecode(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function serveStatic(req, res, pathname) {
  let requested = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(PUBLIC, requested));

  if (!filePath.startsWith(PUBLIC)) {
    return send(res, 403, "Forbidden");
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, "Not found");
    const ext = path.extname(filePath).toLowerCase();
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) return send(res, 500, "Could not read file");
      send(res, 200, data, MIME[ext] || "application/octet-stream");
    });
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  const pathname = parsed.pathname;

  try {
    if (pathname === "/api/sounds") {
      return send(res, 200, JSON.stringify(readJSON(path.join(DATA, "sounds.json"))), "application/json; charset=utf-8");
    }

    if (pathname === "/api/words") {
      return send(res, 200, JSON.stringify(readJSON(path.join(DATA, "words.json"))), "application/json; charset=utf-8");
    }

    if (pathname.startsWith("/api/sound/")) {
      const character = safeDecode(pathname.slice("/api/sound/".length));
      const sounds = readJSON(path.join(DATA, "sounds.json"));
      const found = sounds.find(s => s.character === character);
      if (!found) return send(res, 404, JSON.stringify({error: "Sound not found"}), "application/json; charset=utf-8");
      return send(res, 200, JSON.stringify(found), "application/json; charset=utf-8");
    }

    if (pathname.startsWith("/api/word/")) {
      const word = safeDecode(pathname.slice("/api/word/".length));
      const words = readJSON(path.join(DATA, "words.json"));
      const found = words.find(w => w.word === word);
      if (!found) return send(res, 404, JSON.stringify({error: "Word not found"}), "application/json; charset=utf-8");
      return send(res, 200, JSON.stringify(found), "application/json; charset=utf-8");
    }

    return serveStatic(req, res, pathname);
  } catch (error) {
    console.error(error);
    return send(res, 500, "Server error");
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`SanskritSvara running at http://localhost:${PORT} (or your deployed URL)`);
});
