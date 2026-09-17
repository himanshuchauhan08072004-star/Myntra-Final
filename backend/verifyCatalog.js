const fs = require("fs");
const path = require("path");

const products = JSON.parse(fs.readFileSync(path.join(__dirname, "product.json"), "utf8"));
const missingImages = products.filter((p) => !Array.isArray(p.images) || p.images.length === 0);
const missingDescriptions = products.filter((p) => !p.description);

console.log(`Canonical products: ${products.length}`);
console.log(`Products with images: ${products.length - missingImages.length}`);
console.log(`Products with descriptions: ${products.length - missingDescriptions.length}`);

if (missingImages.length || missingDescriptions.length) process.exitCode = 1;
