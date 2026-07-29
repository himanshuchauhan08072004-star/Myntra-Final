const path = require("path");
const PDFDocument = require("pdfkit");

const FONT_REGULAR = path.join(__dirname, "..", "assets", "fonts", "DejaVuSans.ttf");
const FONT_BOLD = path.join(__dirname, "..", "assets", "fonts", "DejaVuSans-Bold.ttf");

// pdfkit's built-in Helvetica/WinAnsi fonts silently DROP the ₹ glyph
// (U+20B9) instead of erroring — it just vanishes from the output. DejaVu
// Sans covers it, so we register and use it for the whole document.
function money(cents) {
  return `₹${(cents / 100).toFixed(2)}`;
}

function streamInvoicePdf(res, { order }) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  doc.registerFont("body", FONT_REGULAR);
  doc.registerFont("bold", FONT_BOLD);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${order.invoiceNumber}.pdf"`);
  doc.pipe(res);

  doc.font("bold").fontSize(22).fillColor("#111").text("Myntra Clone", { continued: false });
  doc.font("body").fontSize(9).fillColor("#666").text("Tax Invoice");
  doc.moveDown(1.5);

  const topY = doc.y;
  doc.font("bold").fontSize(10).fillColor("#111").text(`Invoice #: ${order.invoiceNumber}`, { align: "right" });
  doc.font("body").fontSize(9).fillColor("#666").text(`Date: ${new Date(order.placedAt).toLocaleDateString("en-IN")}`, { align: "right" });
  doc.text(`Status: ${order.status.toUpperCase()}`, { align: "right" });
  doc.text(`Payment method: ${order.paymentMethod}`, { align: "right" });
  doc.y = topY;

  doc.font("bold").fontSize(10).fillColor("#111").text("Shipping Address");
  doc.font("body").fontSize(9).fillColor("#444").text(order.shippingAddress, { width: 260 });
  doc.moveDown(1.5);

  // Table header
  const colX = { name: 50, size: 260, qty: 320, price: 380, total: 460 };
  const tableTop = doc.y;
  doc.font("bold").fontSize(9).fillColor("#111");
  doc.text("Item", colX.name, tableTop, { width: 200 });
  doc.text("Size/Color", colX.size, tableTop, { width: 55 });
  doc.text("Qty", colX.qty, tableTop, { width: 40, align: "right" });
  doc.text("Price", colX.price, tableTop, { width: 70, align: "right" });
  doc.text("Total", colX.total, tableTop, { width: 90, align: "right" });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ccc").stroke();
  doc.moveDown(0.5);

  doc.font("body").fontSize(9).fillColor("#333");
  order.items.forEach((item) => {
    const rowY = doc.y;
    const lineTotal = item.unitPriceCents * item.quantity;
    const variant = [item.size, item.color].filter(Boolean).join(" / ") || "—";
    doc.text(item.productName, colX.name, rowY, { width: 200 });
    doc.text(variant, colX.size, rowY, { width: 55 });
    doc.text(String(item.quantity), colX.qty, rowY, { width: 40, align: "right" });
    doc.text(money(item.unitPriceCents), colX.price, rowY, { width: 70, align: "right" });
    doc.text(money(lineTotal), colX.total, rowY, { width: 90, align: "right" });
    doc.moveDown(0.8);
  });

  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ccc").stroke();
  doc.moveDown(0.8);

  const summaryX = 380;
  doc.font("body").fontSize(10).fillColor("#333");
  doc.text("Subtotal", summaryX, doc.y, { width: 90, continued: true });
  doc.text(money(order.subtotalCents), { width: 90, align: "right" });
  doc.text("Tax", summaryX, doc.y, { width: 90, continued: true });
  doc.text(money(order.taxCents), { width: 90, align: "right" });
  doc.text("Shipping", summaryX, doc.y, { width: 90, continued: true });
  doc.text(money(order.shippingCents), { width: 90, align: "right" });
  doc.moveDown(0.3);
  doc.moveTo(summaryX, doc.y).lineTo(545, doc.y).strokeColor("#ccc").stroke();
  doc.moveDown(0.3);
  doc.font("bold").fontSize(12).fillColor("#111");
  doc.text("Total", summaryX, doc.y, { width: 90, continued: true });
  doc.text(money(order.totalCents), { width: 90, align: "right" });

  doc.moveDown(3);
  doc.font("body").fontSize(8).fillColor("#999").text("This is a computer-generated invoice.", 50, doc.y);

  doc.end();
}

module.exports = { streamInvoicePdf };
