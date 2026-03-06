import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("movies.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    year TEXT,
    rating TEXT,
    image TEXT,
    description TEXT,
    director TEXT,
    cast TEXT,
    trailer_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/movies", (req, res) => {
    const movies = db.prepare("SELECT * FROM movies ORDER BY created_at DESC").all();
    res.json(movies.map(m => ({
      ...m,
      cast: m.cast ? JSON.parse(m.cast) : []
    })));
  });

  app.post("/api/movies", (req, res) => {
    const { id, title, year, rating, image, description, director, cast, trailer_url } = req.body;
    try {
      const stmt = db.prepare(`
        INSERT INTO movies (id, title, year, rating, image, description, director, cast, trailer_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, title, year, rating, image, description, director, JSON.stringify(cast), trailer_url);
      res.status(201).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/movies/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM movies WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
