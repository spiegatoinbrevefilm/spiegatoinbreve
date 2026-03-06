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
    genre TEXT,
    is_featured INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migrations
try {
  db.exec("ALTER TABLE movies ADD COLUMN genre TEXT");
} catch (e) {}
try {
  db.exec("ALTER TABLE movies ADD COLUMN is_featured INTEGER DEFAULT 0");
} catch (e) {}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/movies", (req, res) => {
    const movies = db.prepare("SELECT * FROM movies ORDER BY created_at DESC").all();
    console.log("SERVER: Fetched movies with IDs:", movies.map(m => m.id));
    res.json(movies.map(m => ({
      ...m,
      cast: m.cast ? JSON.parse(m.cast) : [],
      is_featured: m.is_featured === 1
    })));
  });

  app.post("/api/movies", (req, res) => {
    console.log("Received movie data:", req.body);
    const { id, title, year, rating, image, description, director, cast, trailer_url, genre, is_featured } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    try {
      const stmt = db.prepare(`
        INSERT INTO movies (id, title, year, rating, image, description, director, cast, trailer_url, genre, is_featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(id, title, year, rating, image, description, director, JSON.stringify(cast || []), trailer_url, genre, is_featured ? 1 : 0);
      console.log("Movie saved successfully:", title);
      res.status(201).json({ success: true });
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/movies/:id", (req, res) => {
    const { id } = req.params;
    const { title, year, rating, image, description, director, cast, trailer_url, genre, is_featured } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    try {
      const stmt = db.prepare(`
        UPDATE movies 
        SET title = ?, year = ?, rating = ?, image = ?, description = ?, director = ?, cast = ?, trailer_url = ?, genre = ?, is_featured = ?
        WHERE id = ?
      `);
      const result = stmt.run(title, year, rating, image, description, director, JSON.stringify(cast || []), trailer_url, genre, is_featured ? 1 : 0, id);
      if (result.changes > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Movie not found" });
      }
    } catch (error) {
      console.error("Update error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/movies/:id", (req, res) => {
    const { id } = req.params;
    handleDelete(id, res);
  });

  app.post("/api/movies/:id/delete", (req, res) => {
    const { id } = req.params;
    handleDelete(id, res);
  });

  function handleDelete(id: string, res: any) {
    console.log("DELETE REQUEST - ID received:", id);
    try {
      // Try to delete by string ID first
      let result = db.prepare("DELETE FROM movies WHERE id = ?").run(id);
      
      // If no changes, try to parse as number just in case
      if (result.changes === 0 && !isNaN(Number(id))) {
        console.log("No match for string ID, trying numeric ID:", id);
        result = db.prepare("DELETE FROM movies WHERE id = ?").run(Number(id));
      }

      if (result.changes > 0) {
        console.log("DELETE SUCCESS - Movie removed from DB");
        res.json({ success: true });
      } else {
        console.warn("DELETE FAILED - No movie found with ID:", id);
        res.status(404).json({ error: "Movie not found in database" });
      }
    } catch (error) {
      console.error("DELETE ERROR - Database exception:", error);
      res.status(500).json({ error: error.message });
    }
  }

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
