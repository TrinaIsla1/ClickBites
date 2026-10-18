import "dotenv/config";
import express from "express";
import cors from "cors";
import db from "./db.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import shopRoutes from "./routes/shops.js";
import favoriteRoutes from "./routes/favorites.js";
import orderRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  const result = db.prepare("SELECT 1 AS ok").get();
  res.json({ ok: result.ok === 1, service: "ClickBites API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/shops", shopRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`ClickBites API running at http://localhost:${PORT}`);
});