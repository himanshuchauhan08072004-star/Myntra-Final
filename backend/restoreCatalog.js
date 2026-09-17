// Restore the canonical internship product catalog from backend/product.json.
//
// This script is intentionally explicit: it changes only products, categories,
// and demo reviews. Run it when the deployed database contains a different
// catalog than the one committed with this project.
//
// Usage:
//   cd backend
//   node restoreCatalog.js
//
// Requires MONGO_URI in backend/.env.

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

async function restoreCatalog() {
  if (!process.env.MONGO_URI) {
    throw new Error("Missing MONGO_URI in backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const productData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "product.json"), "utf8")
  );
  const categoryData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "category.json"), "utf8")
  );

  if (!Array.isArray(productData) || productData.length === 0) {
    throw new Error("backend/product.json is empty or invalid");
  }

  console.log(`Restoring ${productData.length} canonical products...`);

  // This is a deliberate catalog restore. Existing product IDs cannot be
  // reused because the wrong deployed catalog may contain unrelated records.
  await Product.deleteMany({});
  await Category.deleteMany({});
  await Review.deleteMany({});

  try { await Product.collection.dropIndexes(); } catch (_) {}
  try { await Category.collection.dropIndexes(); } catch (_) {}

  const DEFAULT_COLOR_SETS = [
    ["Black", "White", "Navy"],
    ["Maroon", "Beige", "Olive"],
    ["Red", "Blue"],
    ["Grey", "Black"],
  ];

  const cleanProducts = productData.map(({ id, stock, colors, ...rest }, i) => ({
    ...rest,
    stock: typeof stock === "number" ? stock : 20 + Math.floor(Math.random() * 30),
    colors:
      Array.isArray(colors) && colors.length > 0
        ? colors
        : DEFAULT_COLOR_SETS[i % DEFAULT_COLOR_SETS.length],
  }));

  const insertedProducts = await Product.insertMany(cleanProducts);
  console.log(`Inserted ${insertedProducts.length} products`);

  // Recreate the same small demo review set used by the project's seed flow.
  const DEMO_REVIEWERS = [
    { fullName: "Aisha Khan", email: "demo.reviewer1@myntraclone.test" },
    { fullName: "Rohan Mehta", email: "demo.reviewer2@myntraclone.test" },
    { fullName: "Priya Nair", email: "demo.reviewer3@myntraclone.test" },
    { fullName: "Sanjay Gupta", email: "demo.reviewer4@myntraclone.test" },
  ];
  const demoPasswordHash = await bcrypt.hash("Demo@12345", 10);
  const reviewerUsers = [];
  for (const reviewer of DEMO_REVIEWERS) {
    const user = await User.findOneAndUpdate(
      { email: reviewer.email },
      {
        $setOnInsert: {
          fullName: reviewer.fullName,
          email: reviewer.email,
          password: demoPasswordHash,
        },
      },
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
    const count = 2 + Math.floor(Math.random() * 2);
    const shuffled = [...reviewerUsers].sort(() => Math.random() - 0.5).slice(0, count);
    shuffled.forEach((reviewer, idx) => {
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

  if (reviewDocs.length) await Review.insertMany(reviewDocs);

  for (const product of insertedProducts) {
    const productReviews = reviewDocs.filter((r) => r.productId.equals(product._id));
    const avg = productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length;
    await Product.updateOne(
      { _id: product._id },
      { rating: Math.round(avg * 10) / 10, reviewCount: productReviews.length }
    );
  }

  const allProductIds = insertedProducts.map((p) => p._id);
  const cleanCategories = categoryData.map(({ productId, ...rest }) => ({
    ...rest,
    productId: allProductIds,
  }));
  await Category.insertMany(cleanCategories);

  console.log("Catalog restore complete.");
  console.log("The product names, prices, descriptions and image URLs now match backend/product.json.");
}

restoreCatalog()
  .catch((error) => {
    console.error("Catalog restore failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
