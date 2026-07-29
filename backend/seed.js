// One-time data loader: pushes backend/product.json and backend/category.json
// into your MongoDB so the app isn't empty on first run.
//
// Usage:
//   cd backend
//   node seed.js
//
// Requires .env with MONGO_URI already set (see .env.example).

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const Product = require("./models/Product");
const Category = require("./models/Category");
const User = require("./models/User");
const Review = require("./models/Review");

dotenv.config();

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error("Missing MONGO_URI in .env — copy .env.example to .env and fill it in first.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const productData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "product.json"), "utf-8")
  );
  const categoryData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "category.json"), "utf-8")
  );

  await Product.deleteMany({});
  await Category.deleteMany({});
  await Review.deleteMany({});
  console.log("Cleared old products/categories/reviews");

  // This database has leftover indexes from an older/different schema
  // (e.g. a unique index on "variants.sku" that our Product model doesn't
  // use). Those stale indexes cause duplicate-key errors on insert even
  // though the collection is empty. Drop all non-_id indexes to be safe.
  try {
    await Product.collection.dropIndexes();
    console.log("Dropped stale product indexes");
  } catch (e) {
    // no indexes to drop, or collection doesn't exist yet — fine either way
  }
  try {
    await Category.collection.dropIndexes();
    console.log("Dropped stale category indexes");
  } catch (e) {
    // same as above
  }

  // Sample data predates the "stock" and "colors" fields added during the
  // merge — without this every product seeds with stock: 0 (unbuyable) and
  // no color options (variant selector has nothing to show).
  const DEFAULT_COLOR_SETS = [
    ["Black", "White", "Navy"],
    ["Maroon", "Beige", "Olive"],
    ["Red", "Blue"],
    ["Grey", "Black"],
  ];
  const cleanProducts = productData.map(({ id, stock, colors, ...rest }, i) => ({
    ...rest,
    stock: typeof stock === "number" ? stock : 20 + Math.floor(Math.random() * 30),
    colors: Array.isArray(colors) && colors.length > 0 ? colors : DEFAULT_COLOR_SETS[i % DEFAULT_COLOR_SETS.length],
  }));
  const insertedProducts = await Product.insertMany(cleanProducts);
  console.log(`Inserted ${insertedProducts.length} products`);

  // Demo reviewer accounts — product.json ships with a fake reviewCount/rating
  // (e.g. "4302 reviews") but no actual Review documents ever back that number,
  // so the product page always showed "No reviews yet" despite the big count.
  // Seed real reviews and let them be the source of truth instead.
  const DEMO_REVIEWERS = [
    { fullName: "Aisha Khan", email: "demo.reviewer1@myntraclone.test" },
    { fullName: "Rohan Mehta", email: "demo.reviewer2@myntraclone.test" },
    { fullName: "Priya Nair", email: "demo.reviewer3@myntraclone.test" },
    { fullName: "Sanjay Gupta", email: "demo.reviewer4@myntraclone.test" },
  ];
  const demoPasswordHash = await bcrypt.hash("Demo@12345", 10);
  const reviewerUsers = [];
  for (const r of DEMO_REVIEWERS) {
    const user = await User.findOneAndUpdate(
      { email: r.email },
      { $setOnInsert: { fullName: r.fullName, email: r.email, password: demoPasswordHash } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    reviewerUsers.push(user);
  }

  const REVIEW_TEMPLATES = [
    { rating: 5, title: "Loved it", comment: "Fits true to size and the fabric feels premium. Would buy again." },
    { rating: 4, title: "Great value", comment: "Good quality for the price. Delivery was quick too." },
    { rating: 4, title: "Pretty good", comment: "Color is slightly different from the photos but overall happy with it." },
    { rating: 5, title: "Exceeded expectations", comment: "Better in person than in the pictures. Highly recommend." },
    { rating: 3, title: "Decent", comment: "It's okay — does the job but nothing special." },
  ];

  const reviewDocs = [];
  for (const product of insertedProducts) {
    const count = 2 + Math.floor(Math.random() * 2); // 2-3 reviews per product
    const shuffledReviewers = [...reviewerUsers].sort(() => Math.random() - 0.5).slice(0, count);
    shuffledReviewers.forEach((reviewer, idx) => {
      const template = REVIEW_TEMPLATES[Math.floor(Math.random() * REVIEW_TEMPLATES.length)];
      reviewDocs.push({
        userId: reviewer._id,
        productId: product._id,
        rating: template.rating,
        title: template.title,
        comment: template.comment,
        verifiedPurchase: idx % 2 === 0,
      });
    });
  }
  const insertedReviews = await Review.insertMany(reviewDocs);
  console.log(`Inserted ${insertedReviews.length} demo reviews`);

  // Recompute rating/reviewCount per product from the reviews that actually
  // exist — same aggregate reviewService.js uses after a real review is
  // posted, so the number shown never drifts from what's in the Reviews tab.
  for (const product of insertedProducts) {
    const productReviews = reviewDocs.filter((r) => r.productId.equals(product._id));
    const avg = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
    await Product.updateOne(
      { _id: product._id },
      { rating: Math.round(avg * 10) / 10, reviewCount: productReviews.length }
    );
  }
  console.log("Synced product rating/reviewCount to match seeded reviews");

  // sample category.json has stale $oid references from the original author's
  // DB — those won't exist in your database, so we drop them and instead
  // link every category to all products (fine for a demo; refine later if
  // you want categories to filter products for real).
  const allProductIds = insertedProducts.map((p) => p._id);
  const cleanCategories = categoryData.map(({ productId, ...rest }) => ({
    ...rest,
    productId: allProductIds,
  }));
  const insertedCategories = await Category.insertMany(cleanCategories);
  console.log(`Inserted ${insertedCategories.length} categories`);

  console.log("Seed complete.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});