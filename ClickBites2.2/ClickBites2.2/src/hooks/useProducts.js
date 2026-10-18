import { useCallback, useEffect, useState } from "react";
import { api } from "../api";

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productData, shopData] = await Promise.all([api.products(), api.shops()]);
      setProducts(productData.products);
      setShops(shopData.shops);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { products, shops, loading, error, reload: load, setProducts };
}