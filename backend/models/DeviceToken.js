const mongoose = require("mongoose");

// Stores a Web Push subscription (the browser-native equivalent of an Expo
// push token for this React-web stack — same role, different transport).
// One document per browser/device the user has enabled push on.
const DeviceTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: String,
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

DeviceTokenSchema.index({ userId: 1 });

module.exports = mongoose.model("DeviceToken", DeviceTokenSchema);
