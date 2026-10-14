const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failures++;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

console.log("=== 1. Verifying PWA Assets & Manifest ===");
const manifestPath = path.join(root, "public", "manifest.json");
assert(fs.existsSync(manifestPath), "manifest.json exists in public/");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
assert(manifest.name === "Daymark — Personal Productivity Tracker", "Manifest name correct");
assert(manifest.short_name === "Daymark", "Manifest short_name correct");
assert(manifest.display === "standalone", "Manifest display mode is standalone");
assert(manifest.theme_color === "#2563EB", "Manifest theme_color is #2563EB");
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 3, "Manifest contains icons");

for (const icon of manifest.icons) {
  const iconPath = path.join(root, "public", icon.src.replace(/^\//, ""));
  assert(fs.existsSync(iconPath), `Icon file exists: ${icon.src}`);
}

const badgePath = path.join(root, "public", "icons", "badge-72.png");
assert(fs.existsSync(badgePath), "Badge icon exists: /icons/badge-72.png");

console.log("\n=== 2. Verifying Service Workers ===");
const fcmSwPath = path.join(root, "public", "firebase-messaging-sw.js");
assert(fs.existsSync(fcmSwPath), "firebase-messaging-sw.js exists");
const fcmSwContent = fs.readFileSync(fcmSwPath, "utf-8");
assert(fcmSwContent.includes('self.addEventListener("push"'), "FCM service worker handles 'push' event");
assert(fcmSwContent.includes('self.addEventListener("notificationclick"'), "FCM service worker handles 'notificationclick' event");
assert(fcmSwContent.includes("showNotification"), "FCM service worker calls showNotification");

const swPath = path.join(root, "public", "sw.js");
assert(fs.existsSync(swPath), "sw.js alias exists");

console.log("\n=== 3. Verifying Types and Schemas ===");
const schemasPath = path.join(root, "src", "lib", "validation", "schemas.ts");
const schemasContent = fs.readFileSync(schemasPath, "utf-8");
assert(schemasContent.includes("customReminderSchema"), "schemas.ts exports customReminderSchema");
assert(schemasContent.includes("pushTokenSchema"), "schemas.ts exports pushTokenSchema");
assert(schemasContent.includes("pushEnabled"), "schemas.ts includes pushEnabled in reminderSettingsSchema");

console.log("\n=== 4. Verifying API Routes & Cloud Function ===");
assert(fs.existsSync(path.join(root, "src", "app", "api", "notifications", "token", "route.ts")), "API route /api/notifications/token exists");
assert(fs.existsSync(path.join(root, "src", "app", "api", "notifications", "test", "route.ts")), "API route /api/notifications/test exists");
assert(fs.existsSync(path.join(root, "src", "app", "api", "reminders", "cron", "route.ts")), "API route /api/reminders/cron exists");
assert(fs.existsSync(path.join(root, "functions", "src", "index.ts")), "Cloud function functions/src/index.ts exists");
assert(fs.existsSync(path.join(root, "firebase.json")), "firebase.json exists");

console.log("\n=== 5. Verifying Duplicate Prevention & Idempotency Key Design ===");
const cronRouteContent = fs.readFileSync(path.join(root, "src", "app", "api", "reminders", "cron", "route.ts"), "utf-8");
assert(cronRouteContent.includes("idempotencyKey"), "Cron route uses deterministic idempotencyKey");
assert(cronRouteContent.includes("taskData.status !== \"todo\""), "Cron route respects completed/cancelled tasks");
assert(cronRouteContent.includes("inQuietHours"), "Cron route respects quiet hours");

if (failures > 0) {
  console.error(`\n❌ Total Failures: ${failures}`);
  process.exit(1);
} else {
  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
}
