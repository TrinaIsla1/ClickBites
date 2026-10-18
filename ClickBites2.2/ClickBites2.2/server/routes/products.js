import { Router } from "express";
import db from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  const products = db.prepare(`
    SELECT p.*, s.name AS shop_name, s.is_open AS shop_open, s.address AS shop_address
    FROM products p
    JOIN shops s ON s.id = p.shop_id
    WHERE p.available = 1
    ORDER BY p.id
  `).all();
  res.json({ products });
});

export default router;