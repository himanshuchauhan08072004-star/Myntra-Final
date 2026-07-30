const webpush = require("web-push");
const DeviceToken = require("../models/DeviceToken");

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
const configured = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (configured) {
  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:support@example.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
} else {
  console.warn(
    "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set - push notifications will be skipped. " +
      "Generate a pair with: npx web-push generate-vapid-keys"
  );
}

async function sendPushToUser(userId, payload) {
  if (!configured) {
    console.log(`[push] skipped for user ${userId}: VAPID not configured`);
    return { sent: 0, removed: 0 };
  }

  const tokens = await DeviceToken.find({ userId });
  if (tokens.length === 0) {
    console.log(`[push] no device tokens registered for user ${userId} - nothing to send`);
    return { sent: 0, removed: 0 };
  }

  let sent = 0;
  let removed = 0;

  await Promise.all(
    tokens.map(async (token) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: token.endpoint,
            keys: { p256dh: token.keys.p256dh, auth: token.keys.auth },
          },
          JSON.stringify(payload)
        );
        sent += 1;
      } catch (err) {
        if ([404, 410, 401, 403].includes(err.statusCode)) {
          await DeviceToken.deleteOne({ _id: token._id });
          removed += 1;
          console.warn(`[push] removed dead token ${token._id} for user ${userId}: status=${err.statusCode}`);
        } else {
          console.error(`[push] send failed for token ${token._id} (user ${userId}): status=${err.statusCode} body=${err.body}`);
        }
      }
    })
  );

  console.log(`[push] user ${userId}: ${tokens.length} token(s), sent=${sent}, removed=${removed}`);
  return { sent, removed };
}

module.exports = { sendPushToUser, isPushConfigured: () => configured };