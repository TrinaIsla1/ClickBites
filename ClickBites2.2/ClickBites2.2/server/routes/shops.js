import { Router } from "express";
import db from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  const shops = db.prepare("SELECT * FROM shops ORDER BY id").all();
  res.json({ shops });
});

export default router;