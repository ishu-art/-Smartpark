const mongoose = require("mongoose");

const parkingSlotSchema = new mongoose.Schema(
  {
    parkingLot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ParkingLot",
      required: true,
    },

    slotNumber: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["available", "occupied", "reserved"],
      default: "available",
    },

    // Feature 9: Parking Floor Selection
    floor: {
      type: Number,
      default: 1,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const ParkingSlot = mongoose.model(
  "ParkingSlot",
  parkingSlotSchema
);

module.exports = ParkingSlot;