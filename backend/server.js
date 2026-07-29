const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const userrouter = require("./routes/Userroutes");
const categoryrouter = require("./routes/Categoryroutes");
const productrouter = require("./routes/Productroutes");
const Bagroutes = require("./routes/Bagroutes");
const Wishlistroutes = require("./routes/Wishlistroutes");
const OrderRoutes = require("./routes/OrderRoutes");
const HistoryRoutes = require("./routes/HistoryRoutes");
const RecommendationRoutes = require("./routes/RecommendationRoutes");
const NotificationRoutes = require("./routes/NotificationRoutes");
const ReviewRoutes = require("./routes/ReviewRoutes");
const WebhookRoutes = require("./routes/WebhookRoutes");
const cors = require('cors');
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");
const { initSockets } = require("./sockets");
const { runAbandonedCartCheck } = require("./services/notificationService");

const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.error(`❌ Missing required env vars: ${missingEnv.join(", ")}`);
  process.exit(1);
}
if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn(
    "⚠️  STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET not set in backend/.env — checkout will fail until these are added. Get free test keys at https://dashboard.stripe.com/test/apikeys"
  );
}

const app = express();

// Stripe webhook needs the raw body for signature verification — must be
// mounted BEFORE express.json() or the body arrives already parsed/mutated.
app.use("/webhooks", express.raw({ type: "application/json" }), WebhookRoutes);

app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true,
}));
app.get("/", (req, res) => {
  res.send("✅ Myntra backend in working");
});
app.use("/user", userrouter);
app.use("/category", categoryrouter);
app.use("/product", productrouter);
app.use("/bag", Bagroutes);
app.use("/wishlist", Wishlistroutes);
app.use("/order", OrderRoutes);
app.use("/Order", OrderRoutes); // deprecated alias, kept for backward compat — remove after frontend migrates
app.use("/history", HistoryRoutes);
app.use("/recommendations", RecommendationRoutes);
app.use("/notifications", NotificationRoutes);
app.use("/reviews", ReviewRoutes);
app.use(notFoundHandler);
app.use(errorHandler);
const Wishlist = require("./models/Wishlist");
const Bag = require("./models/Bag");
const SaveForLater = require("./models/SaveForLater");
const Product = require("./models/Product");

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Mongodb connected");
    try {
      await Wishlist.syncIndexes();
      await Bag.syncIndexes();
      await SaveForLater.syncIndexes();
      await Product.syncIndexes();
      console.log("Indexes synced (Wishlist, Bag, SaveForLater, Product)");
    } catch (err) {
      console.error("Index sync failed:", err.message);
    }

    // Scheduled job: abandoned-cart reminders. Runs hourly; the job itself
    // checks a 24h idle threshold + 24h per-user cooldown, so an hourly
    // interval is just the check frequency, not the notification frequency.
    // A real cron package would be the production choice — plain
    // setInterval avoids adding a new dependency for this MVP scope.
    const ABANDONED_CART_CHECK_INTERVAL_MS = 60 * 60 * 1000;
    setInterval(async () => {
      try {
        const result = await runAbandonedCartCheck();
        if (result.notified > 0) {
          console.log(`[abandoned-cart] checked ${result.checked} users, notified ${result.notified}`);
        }
      } catch (err) {
        console.error("[abandoned-cart] check failed:", err.message);
      }
    }, ABANDONED_CART_CHECK_INTERVAL_MS);
  })
  .catch((err) => console.log(err));

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initSockets(server);
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
