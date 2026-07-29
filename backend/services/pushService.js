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
  const title = payload.title;
  const message = payload.message;
  const data = payload.data || {};

  if (!configured) return { sent: 0, removed: 0 };

  const tokens = await DeviceToken.find({ userId: userId });
  if (tokens.length === 0) return { sent: 0, removed: 0 };

  const body = JSON.stringify({ title: title, body: message, data: data });

  let sent = 0;
  let removed = 0;

  await Promise.all(
    tokens.map(async function (token) {
      try {
        await webpush.sendNotification(
          {
            endpoint: token.endpoint,
            keys: { p256dh: token.keys.p256dh, auth: token.keys.auth },
          },
          body
        );
        sent += 1;
      } catch (err) {
        const deadCodes = [404, 410, 401, 403];
        if (deadCodes.indexOf(err.statusCode) !== -1) {
          await DeviceToken.deleteOne({ _id: token._id });
          removed += 1;
        } else {
          console.error(
            "[push] send failed for token " + token._id + ": status=" + err.statusCode + " body=" + err.body
          );
        }
      }
    })
  );

  return { sent: sent, removed: removed };
}

module.exports = { sendPushToUser: sendPushToUser, isPushConfigured: function () { return configured; } };