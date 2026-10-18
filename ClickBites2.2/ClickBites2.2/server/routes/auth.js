import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";
import { requireAuth, SECRET } from "../middleware/auth.js";

const router = Router();

function safeUser(row) {
  return { id: row.id, name: row.name, phone: row.phone, email: row.email, role: row.role, created_at: row.created_at };
}

router.post("/register", (req, res) => {
  const { name, phone, email, password, role = "customer" } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "Name, email and password are required." });
  if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters." });
  if (!["customer", "partner"].includes(role)) return res.status(400).json({ message: "Invalid registration role." });

  try {
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare("INSERT INTO users (name, phone, email, password_hash, role) VALUES (?, ?, ?, ?, ?)")
      .run(name.trim(), phone?.trim() || null, email.trim().toLowerCase(), hash, role);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid);
    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) return res.status(409).json({ message: "That email is already registered." });
    res.status(500).json({ message: "Registration failed." });
  }
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email || "").trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password || "", user.password_hash)) {
    return res.status(401).json({ message: "Invalid email or password." });
  }
  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, SECRET, { expiresIn: "7d" });
  res.json({ token, user: safeUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found." });
  res.json({ user: safeUser(user) });
});

export default router;