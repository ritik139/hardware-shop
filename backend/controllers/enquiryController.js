const Enquiry = require("../models/Enquiry");
const { sendEnquiryNotification } = require("../utils/sendEmail");

const STATUSES = ["new", "seen", "replied"];
// the admin list is capped so one huge inbox can never slow the panel down (newest first)
const ADMIN_LIST_LIMIT = 2000;
const isObjectId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
// cleans a text field: must be a string, trimmed, max length
const text = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// POST /api/enquiries  (public — contact form submits here)
async function createEnquiry(req, res) {
  try {
    const body = req.body || {};
    const name = text(body.name, 100);
    const phone = text(body.phone, 20);
    const interest = text(body.interest, 100) || "Something else";
    const message = text(body.message, 2000);
    const productRef = text(body.productRef, 300);

    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }
    // digits, spaces, + ( ) - . only, with at least 7 digits (e.g. "+91 90246 55202")
    if (!/^[0-9+()\-.\s]+$/.test(phone) || phone.replace(/\D/g, "").length < 7) {
      return res.status(400).json({ message: "Please enter a valid phone number" });
    }

    const enquiry = await Enquiry.create({ name, phone, interest, message, productRef });

    // Don't make the visitor wait for the email to send —
    // save first, respond, then send notification in the background.
    res.status(201).json({ message: "Enquiry received, we'll get back to you soon!", id: enquiry._id });

    sendEnquiryNotification(enquiry); // never throws (errors are logged inside)
  } catch (err) {
    console.error("createEnquiry error:", err.message);
    if (!res.headersSent) res.status(500).json({ message: "Server error" });
  }
}

// GET /api/enquiries/admin/all  (admin — view all enquiries, newest first)
async function getAllEnquiries(req, res) {
  try {
    const filter = {};
    if (typeof req.query.status === "string" && STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }
    const enquiries = await Enquiry.find(filter)
      .select("-__v")
      .sort({ createdAt: -1 })
      .limit(ADMIN_LIST_LIMIT)
      .lean();
    res.json(enquiries);
  } catch (err) {
    console.error("getAllEnquiries error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

// PATCH /api/enquiries/admin/:id  (admin — mark as seen/replied)
async function updateEnquiryStatus(req, res) {
  try {
    const status = req.body && req.body.status;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: "Status must be one of: " + STATUSES.join(", ") });
    }
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ message: "Enquiry not found" });
    }
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found" });
    res.json(enquiry);
  } catch (err) {
    console.error("updateEnquiryStatus error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

// DELETE /api/enquiries/admin/:id  (admin)
async function deleteEnquiry(req, res) {
  try {
    if (!isObjectId(req.params.id)) {
      return res.status(404).json({ message: "Enquiry not found" });
    }
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found" });
    res.json({ message: "Enquiry deleted" });
  } catch (err) {
    console.error("deleteEnquiry error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = { createEnquiry, getAllEnquiries, updateEnquiryStatus, deleteEnquiry };