const Enquiry = require("../models/Enquiry");
const { sendEnquiryNotification } = require("../utils/sendEmail");

// POST /api/enquiries  (public — contact form submits here)
async function createEnquiry(req, res) {
  try {
    const { name, phone, interest, message, productRef } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }

    const enquiry = await Enquiry.create({ name, phone, interest, message, productRef });

    // Don't make the visitor wait for the email to send —
    // save first, respond, then send notification in the background.
    res.status(201).json({ message: "Enquiry received, we'll get back to you soon!", id: enquiry._id });

    sendEnquiryNotification(enquiry);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// GET /api/admin/enquiries  (admin — view all enquiries, newest first)
async function getAllEnquiries(req, res) {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const enquiries = await Enquiry.find(filter).sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// PATCH /api/admin/enquiries/:id  (admin — mark as seen/replied)
async function updateEnquiryStatus(req, res) {
  try {
    const { status } = req.body;
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found" });
    res.json(enquiry);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

// DELETE /api/admin/enquiries/:id  (admin)
async function deleteEnquiry(req, res) {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found" });
    res.json({ message: "Enquiry deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

module.exports = { createEnquiry, getAllEnquiries, updateEnquiryStatus, deleteEnquiry };