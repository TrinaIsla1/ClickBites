import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/stats", requireAuth, requireRole("admin", "partner", "rider"), (req, res) => {
  const users = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  const shops = db.prepare("SELECT COUNT(*) AS count FROM shops").get().count;
  const orders = db.prepare("SELECT COUNT(*) AS count FROM orders").get().count;
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) AS total FROM orders WHERE status != 'Cancelled'").get().total;
  res.json({ users, shops, orders, revenue });
});

export default router;