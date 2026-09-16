const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    parkingLot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParkingLot",
      required: true,
    },

    parkingSlot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParkingSlot",
      required: true,
    },

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "completed", "cancelled"],
      default: "active",
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Feature 4: QR Code Booking
    // Booking confirm hone ke baad QR code (base64 data URL) yahan store hoga
    qrCode: {
      type: String,
      default: "",
    },

    // Feature 8: Automatic Slot Release
    // Jab cron job automatically slot release karega, isko true kar denge
    autoReleased: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Reservation", reservationSchema);