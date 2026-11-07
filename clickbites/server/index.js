import express from "express";
import compression from "compression";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../client/dist");
const PORT = process.env.PORT || 3000;

const app = express();
app.disable("x-powered-by");
app.use(compression());

/* Basic security headers */
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

/* ---------- API ---------- */
/* Data, login and photos live in Supabase and are called straight from the browser
   with the user's own session (Row Level Security does the protecting).
   Add any server-only endpoints here (never put a service_role key in the client). */
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "clickbites", time: new Date().toISOString() });
});
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

/* ---------- Serve the built React app ---------- */
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST, { maxAge: "1h", index: false }));
  app.get("*", (_req, res) => res.sendFile(path.join(DIST, "index.html")));
} else {
  app.get("/", (_req, res) =>
    res
      .status(200)
      .send("React build not found. Run <code>npm run build</code>, or use <code>npm run dev</code> for development.")
  );
}

app.listen(PORT, () => console.log(`ClickBites server running on http://localhost:${PORT}`));
