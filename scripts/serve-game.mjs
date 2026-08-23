import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDirectory, "..");
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

export function createGameServer(root = projectRoot) {
  return http.createServer((request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://localhost");
      const pathname = decodeURIComponent(url.pathname);
      const rootEntry = fs.existsSync(path.join(root, "index.html")) ? "index.html" : "public/index.html";
      const relativePath = pathname === "/" ? rootEntry : pathname.replace(/^\/+/, "");
      const target = path.resolve(root, relativePath);
      if (!target.startsWith(`${root}${path.sep}`)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const stat = fs.statSync(target);
      const filePath = stat.isDirectory() ? path.join(target, "index.html") : target;
      response.writeHead(200, {
        "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not Found");
    }
  });
}

export function startGameServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT ?? 4173);
  const host = options.host ?? "127.0.0.1";
  const server = createGameServer(options.root ?? projectRoot);
  server.listen(port, host, () => {
    console.log(`人生轨迹已启动：http://${host}:${port}`);
    console.log("按 Ctrl+C 停止。");
  });
  return server;
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  startGameServer();
}
