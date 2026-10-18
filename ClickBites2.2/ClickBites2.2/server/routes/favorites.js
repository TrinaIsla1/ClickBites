import { Router } from "express";
import db from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  const favorites = db.prepare(`
    SELECT f.product_id, p.name, p.price
    FROM favorites f JOIN products p ON p.id = f.product_id
    WHERE f.user_id = ? ORDER BY f.created_at DESC
  `).all(req.user.id);
  res.json({ favorites });
});

router.post("/:productId", requireAuth, (req, res) => {
  const product = db.prepare("SELECT id FROM products WHERE id = ?").get(req.params.productId);
  if (!product) return res.status(404).json({ message: "Product not found." });
  db.prepare("INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)").run(req.user.id, product.id);
  res.status(201).json({ message: "Added to favorites." });
});

router.delete("/:productId", requireAuth, (req, res) => {
  db.prepare("DELETE FROM favorites WHERE user_id = ? AND product_id = ?").run(req.user.id, req.params.productId);
  res.json({ message: "Removed from favorites." });
});

export default router;