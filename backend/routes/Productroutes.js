const express = require("express");
const Product = require("../models/Product");
const { notifyPriceDrop, notifyBackInStock } = require("../services/notificationService");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const products = await Product.find(filter);
    res.status(200).json(products);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

router.get("/:id", async (req, res) => {
  const productid = req.params.id;
  try {
    const product = await Product.findById(productid);
    res.status(200).json(product);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

// Price/stock updates — the only place in this codebase a product's price
// or stock ever changes outside of checkout/cancellation. Wired to the two
// notification categories that otherwise have no trigger at all:
// WISHLIST_PRICE_DROP and BACK_IN_STOCK (stock can also flip 0->positive
// via cancellation restock — that path notifies separately in orderService).
//
// NOTE: no admin/role gate exists in this codebase — this is reachable by
// anyone. In production this needs to be restricted to staff/admin.
router.patch("/:id", async (req, res) => {
  try {
    const before = await Product.findById(req.params.id);
    if (!before) return res.status(404).json({ message: "Product not found" });

    const { price, stock } = req.body;
    const update = {};
    if (price !== undefined) update.price = price;
    if (stock !== undefined) update.stock = stock;

    const after = await Product.findByIdAndUpdate(req.params.id, update, { new: true });

    if (price !== undefined && price < before.price) {
      await notifyPriceDrop(after, Math.round(before.price * 100));
    }
    if (stock !== undefined && before.stock === 0 && stock > 0) {
      await notifyBackInStock(after);
    }

    res.status(200).json(after);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
