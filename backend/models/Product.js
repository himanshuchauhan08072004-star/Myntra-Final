const mongoose = require("mongoose");
const ProductSchema = new mongoose.Schema(
  {
    name: String,
    brand: String,
    category: String,
    price: Number,
    originalPrice: Number,
    discount: String,
    rating: Number,
    reviewCount: Number,
    description: String,
    sizes: [String],
    images: [String],
    colors: { type: [String], default: [] },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// category + stock: candidate lookup for recommendations filters on both.
ProductSchema.index({ category: 1, stock: 1 });
// rating + reviewCount: trending sort is a function of these two.
ProductSchema.index({ rating: -1, reviewCount: -1 });
// stock alone: cheap "in stock only" filter used broadly (listing, recs).
ProductSchema.index({ stock: 1 });

module.exports = mongoose.model("Product", ProductSchema);
