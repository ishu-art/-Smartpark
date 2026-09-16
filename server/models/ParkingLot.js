const mongoose = require("mongoose");

const parkingLotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    totalSlots: {
      type: Number,
      required: true,
      min: 1,
    },

    availableSlots: {
      type: Number,
      required: true,
      min: 0,
    },

    pricePerHour: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const ParkingLot = mongoose.model(
  "ParkingLot",
  parkingLotSchema
);

module.exports = ParkingLot;