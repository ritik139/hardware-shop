const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    interest: { type: String, default: "Something else" },
    message: { type: String },
    productRef: { type: String }, // optional: which product page they enquired from
    status: {
      type: String,
      enum: ["new", "seen", "replied"],
      default: "new",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Enquiry", enquirySchema);