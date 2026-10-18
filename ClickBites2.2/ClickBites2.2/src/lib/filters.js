export function filterProducts(products, { query, category, price, rating, openOnly }) {
  return products.filter((product) => {
    const text = `${product.name} ${product.shop_name} ${product.category}`.toLowerCase();
    const q = query.trim().toLowerCase();

    const queryMatch = !q || text.includes(q);
    const categoryMatch = category === "All Categories" || product.category === category;
    const priceMatch =
      price === "Any Price" ||
      (price === "Under ₱100" && product.price < 100) ||
      (price === "₱100–₱200" && product.price >= 100 && product.price <= 200) ||
      (price === "Over ₱200" && product.price > 200);
    const ratingMatch =
      rating === "All Ratings" ||
      (rating === "4.5+ Stars" && product.rating >= 4.5) ||
      (rating === "4.0+ Stars" && product.rating >= 4);
    const openMatch = !openOnly || Boolean(product.shop_open);

    return queryMatch && categoryMatch && priceMatch && ratingMatch && openMatch;
  });
}