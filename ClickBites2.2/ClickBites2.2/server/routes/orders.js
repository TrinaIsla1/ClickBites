import { Router } from "express";
import db from "../db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, (req, res) => {
  const orders = req.user.role === "admin"
    ? db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all()
    : db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  res.json({ orders });
});

router.post("/", requireAuth, (req, res) => {
  const { items, payment_method = "Cash on Delivery", delivery_address = "" } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Order must contain at least one item." });

  const ids = items.map(x => Number(x.product_id)).filter(Boolean);
  const placeholders = ids.map(() => "?").join(",");
  const products = db.prepare(`SELECT * FROM products WHERE id IN (${placeholders})`).all(...ids);

  let total = 0;
  for (const item of items) {
    const product = products.find(p => p.id === Number(item.product_id));
    if (!product) return res.status(400).json({ message: `Product ${item.product_id} was not found.` });
    const qty = Math.max(1, Number(item.quantity) || 1);
    total += product.price * qty;
  }

  const first = products[0];
  const transaction = db.transaction(() => {
    const order = db.prepare("INSERT INTO orders (user_id, shop_id, total, payment_method, delivery_address) VALUES (?, ?, ?, ?, ?)")
      .run(req.user.id, first.shop_id, total, payment_method, delivery_address);
    const insert = db.prepare("INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)");
    for (const item of items) {
      const product = products.find(p => p.id === Number(item.product_id));
      insert.run(order.lastInsertRowid, product.id, Math.max(1, Number(item.quantity) || 1), product.price);
    }
    return order.lastInsertRowid;
  });

  const orderId = transaction();
  res.status(201).json({ message: "Order created.", order_id: orderId, total });
});

router.patch("/:id/status", requireAuth, requireRole("admin", "partner", "rider"), (req, res) => {
  const allowed = ["Pending","Confirmed","Preparing","Ready for Pickup","Out for Delivery","Completed","Cancelled"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ message: "Invalid order status." });
  const result = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(req.body.status, req.params.id);
  if (!result.changes) return res.status(404).json({ message: "Order not found." });
  res.json({ message: "Order status updated." });
});

export default router;