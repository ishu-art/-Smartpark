require("dotenv").config();

const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const QRCode = require("qrcode");
const cron = require("node-cron");

const User = require("./models/user");
const ParkingLot = require("./models/ParkingLot");
const ParkingSlot = require("./models/ParkingSlot");
const Reservation = require("./models/Reservation");
const Feedback = require("./models/Feedback");
const authMiddleware = require("./middleware/authMiddleware");
const adminMiddleware = require("./middleware/adminMiddleware.js");

const app = express();

// =====================================================
// SOCKET.IO SETUP (REAL-TIME UPDATES)
// =====================================================

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

// =====================================================
// FEATURE 7: NOTIFICATION SYSTEM (HELPER)
// =====================================================
// Ye helper function har jagah se call hoga jab bhi
// koi important event (booking/cancellation/auto-release)
// hota hai. Frontend "notification" event sunke on-screen
// notification dikhayega.

const sendNotification = (type, message, data = {}) => {
  io.emit("notification", {
    type, // "success" | "info" | "warning" | "error"
    message,
    data,
    time: new Date().toISOString(),
  });
};

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());

// =====================================================
// MONGODB CONNECTION
// =====================================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected Successfully");
  })
  .catch((error) => {
    console.log("MongoDB Connection Error:", error);
  });

// =====================================================
// HOME ROUTE
// =====================================================

app.get("/", (req, res) => {
  res.send("SmartPark Server Running");
});

// =====================================================
// REGISTER API
// =====================================================

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const allowedRoles = ["user", "admin"];
    const finalRole = allowedRoles.includes(role) ? role : "user";

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: finalRole,
    });

    await user.save();

    res.status(201).json({
      message: "User registered successfully",
    });
  } catch (error) {
    console.log("Register Error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// LOGIN API
// =====================================================

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.log("Login Error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// PROFILE API
// =====================================================

app.get("/api/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Profile fetched successfully",
      user,
    });
  } catch (error) {
    console.log("Profile Error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// CREATE PARKING LOT
// =====================================================

app.post("/api/parking-lots", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      name,
      location,
      totalSlots,
      availableSlots,
      pricePerHour,
    } = req.body;

    if (
      !name ||
      !location ||
      totalSlots === undefined ||
      availableSlots === undefined ||
      pricePerHour === undefined
    ) {
      return res.status(400).json({
        message: "All parking lot fields are required",
      });
    }

    if (totalSlots < 1) {
      return res.status(400).json({
        message: "Total slots must be at least 1",
      });
    }

    if (availableSlots < 0 || availableSlots > totalSlots) {
      return res.status(400).json({
        message: "Available slots must be between 0 and total slots",
      });
    }

    if (pricePerHour < 0) {
      return res.status(400).json({
        message: "Price per hour cannot be negative",
      });
    }

    const parkingLot = new ParkingLot({
      name,
      location,
      totalSlots,
      availableSlots,
      pricePerHour,
    });

    await parkingLot.save();

    io.emit("lotCreated", parkingLot);

    res.status(201).json({
      message: "Parking lot created successfully",
      parkingLot,
    });
  } catch (error) {
    console.log("Create Parking Lot Error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// GET ALL PARKING LOTS
// =====================================================

app.get("/api/parking-lots", async (req, res) => {
  try {
    const { search, minPrice, maxPrice, availableOnly } = req.query;

    const filter = {};

    // Search by name or location
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ name: regex }, { location: regex }];
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      filter.pricePerHour = {};

      if (minPrice !== undefined && minPrice !== "") {
        filter.pricePerHour.$gte = Number(minPrice);
      }

      if (maxPrice !== undefined && maxPrice !== "") {
        filter.pricePerHour.$lte = Number(maxPrice);
      }
    }

    // Filter to only lots that currently have free slots
    if (availableOnly === "true") {
      filter.availableSlots = { $gt: 0 };
    }

    const parkingLots = await ParkingLot.find(filter).sort({
      createdAt: -1,
    });

    res.status(200).json({
      message: "Parking lots fetched successfully",
      parkingLots,
    });
  } catch (error) {
    console.log("Get Parking Lots Error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// CREATE PARKING SLOT
// =====================================================

app.post("/api/parking-slots", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      parkingLot,
      slotNumber,
      status,
      floor,
    } = req.body;

    if (!parkingLot || !slotNumber) {
      return res.status(400).json({
        message: "Parking lot and slot number are required",
      });
    }

    const existingParkingLot = await ParkingLot.findById(
      parkingLot
    );

    if (!existingParkingLot) {
      return res.status(404).json({
        message: "Parking lot not found",
      });
    }

    const existingSlot = await ParkingSlot.findOne({
      parkingLot,
      slotNumber,
    });

    if (existingSlot) {
      return res.status(400).json({
        message: "This parking slot already exists",
      });
    }

    const newSlot = new ParkingSlot({
      parkingLot,
      slotNumber,
      status: status || "available",
      floor: floor !== undefined && floor !== "" ? Number(floor) : 1,
    });

    await newSlot.save();

    io.emit("slotCreated", newSlot);
    sendNotification("success", `New slot ${newSlot.slotNumber} added on floor ${newSlot.floor}`);

    res.status(201).json({
      message: "Parking slot created successfully",
      parkingSlot: newSlot,
    });
  } catch (error) {
    console.log("Create Parking Slot Error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// GET PARKING SLOTS
// =====================================================

app.get(
  "/api/parking-slots/:parkingLotId",
  async (req, res) => {
    try {
      const { parkingLotId } = req.params;
      const { floor } = req.query;

      const parkingLot = await ParkingLot.findById(
        parkingLotId
      );

      if (!parkingLot) {
        return res.status(404).json({
          message: "Parking lot not found",
        });
      }

      // Feature 9: Parking Floor Selection
      // Sabhi floors ki list (filter lagne se pehle) taaki UI tabs bana sake
      const allSlotsForLot = await ParkingSlot.find({
        parkingLot: parkingLotId,
      }).sort({ floor: 1, slotNumber: 1 });

      const floors = [
        ...new Set(allSlotsForLot.map((slot) => slot.floor ?? 1)),
      ].sort((a, b) => a - b);

      const slotFilter = { parkingLot: parkingLotId };

      if (floor !== undefined && floor !== "") {
        slotFilter.floor = Number(floor);
      }

      const parkingSlots = await ParkingSlot.find(slotFilter).sort({
        slotNumber: 1,
      });

      res.status(200).json({
        message: "Parking slots fetched successfully",
        parkingLot,
        parkingSlots,
        floors,
      });
    } catch (error) {
      console.log("Get Parking Slots Error:", error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// UPDATE PARKING SLOT STATUS
// =====================================================

app.put(
  "/api/parking-slots/:slotId",
  authMiddleware,
  async (req, res) => {
    try {
      const { slotId } = req.params;
      const { status } = req.body;

      const allowedStatuses = [
        "available",
        "occupied",
        "reserved",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message:
            "Status must be available, occupied or reserved",
        });
      }

      const parkingSlot = await ParkingSlot.findByIdAndUpdate(
        slotId,
        { status },
        {
          returnDocument: "after",
          runValidators: true,
        }
      );

      if (!parkingSlot) {
        return res.status(404).json({
          message: "Parking slot not found",
        });
      }

      io.emit("slotUpdated", parkingSlot);

      res.status(200).json({
        message: "Parking slot status updated successfully",
        parkingSlot,
      });
    } catch (error) {
      console.log("Update Parking Slot Error:", error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// CREATE RESERVATION
// =====================================================

app.post(
  "/api/reservations",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        parkingLot,
        parkingSlot,
        startTime,
        endTime,
      } = req.body;

      // Required fields
      if (
        !parkingLot ||
        !parkingSlot ||
        !startTime ||
        !endTime
      ) {
        return res.status(400).json({
          message:
            "Parking lot, parking slot, start time and end time are required",
        });
      }

      // Convert dates
      const start = new Date(startTime);
      const end = new Date(endTime);

      // Validate dates
      if (
        isNaN(start.getTime()) ||
        isNaN(end.getTime())
      ) {
        return res.status(400).json({
          message: "Invalid start time or end time",
        });
      }

      // End must be after start
      if (end <= start) {
        return res.status(400).json({
          message: "End time must be after start time",
        });
      }

      // Check parking lot
      const existingParkingLot =
        await ParkingLot.findById(parkingLot);

      if (!existingParkingLot) {
        return res.status(404).json({
          message: "Parking lot not found",
        });
      }

      // Check parking slot
      const existingSlot = await ParkingSlot.findOne({
        _id: parkingSlot,
        parkingLot: parkingLot,
      });

      if (!existingSlot) {
        return res.status(404).json({
          message:
            "Parking slot not found in this parking lot",
        });
      }

      // Check slot status
      if (existingSlot.status !== "available") {
        return res.status(400).json({
          message: "Parking slot is not available",
        });
      }

      // Check overlapping reservation
      const overlappingReservation =
        await Reservation.findOne({
          parkingSlot: parkingSlot,
          status: "active",
          startTime: { $lt: end },
          endTime: { $gt: start },
        });

      if (overlappingReservation) {
        return res.status(400).json({
          message:
            "Parking slot is already reserved for this time",
        });
      }

      // Calculate hours
      const durationInHours =
        (end.getTime() - start.getTime()) /
        (1000 * 60 * 60);

      // Calculate amount
      const totalAmount =
        durationInHours *
        existingParkingLot.pricePerHour;

      // Create reservation
      const reservation = new Reservation({
        user: req.user.userId,
        parkingLot: parkingLot,
        parkingSlot: parkingSlot,
        startTime: start,
        endTime: end,
        status: "active",
        totalAmount: totalAmount,
      });

      await reservation.save();

      // =====================================================
      // FEATURE 4: QR CODE BOOKING
      // =====================================================
      // Booking confirm hote hi ek QR code generate karo jisme
      // reservation ki basic details JSON string ke roop me hoti hain.
      // Ye QR code base64 data URL ke roop me DB me store hota hai.

      try {
        const qrData = JSON.stringify({
          reservationId: reservation._id.toString(),
          slot: existingSlot.slotNumber,
          lot: existingParkingLot.name,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
        });

        const qrCodeDataUrl = await QRCode.toDataURL(qrData);

        reservation.qrCode = qrCodeDataUrl;
        await reservation.save();
      } catch (qrError) {
        console.log("QR Code Generation Error:", qrError);
        // QR fail ho bhi jaye to booking cancel nahi hogi
      }

      // Change slot status
      existingSlot.status = "reserved";
      await existingSlot.save();

      // Decrease available slots
      if (existingParkingLot.availableSlots > 0) {
        existingParkingLot.availableSlots -= 1;
        await existingParkingLot.save();
      }

      io.emit("slotUpdated", existingSlot);
      io.emit("lotUpdated", existingParkingLot);
      io.emit("reservationCreated", reservation);

      sendNotification(
        "success",
        `Booking confirmed for slot ${existingSlot.slotNumber} at ${existingParkingLot.name}`
      );

      res.status(201).json({
        message: "Reservation created successfully",
        reservation,
      });
    } catch (error) {
      console.log("Create Reservation Error:", error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// GET MY RESERVATIONS
// =====================================================

app.get(
  "/api/reservations",
  authMiddleware,
  async (req, res) => {
    try {
      const reservations = await Reservation.find({
        user: req.user.userId,
      })
        .populate("parkingLot")
        .populate("parkingSlot")
        .sort({
          createdAt: -1,
        });

      res.status(200).json({
        message: "Reservations fetched successfully",
        reservations,
      });
    } catch (error) {
      console.log("Get Reservations Error:", error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// GET SINGLE RESERVATION
// =====================================================

app.get(
  "/api/reservations/:reservationId",
  authMiddleware,
  async (req, res) => {
    try {
      const { reservationId } = req.params;

      const reservation =
        await Reservation.findOne({
          _id: reservationId,
          user: req.user.userId,
        })
          .populate("parkingLot")
          .populate("parkingSlot");

      if (!reservation) {
        return res.status(404).json({
          message: "Reservation not found",
        });
      }

      res.status(200).json({
        message: "Reservation fetched successfully",
        reservation,
      });
    } catch (error) {
      console.log("Get Reservation Error:", error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// CANCEL RESERVATION
// =====================================================

app.put(
  "/api/reservations/:reservationId/cancel",
  authMiddleware,
  async (req, res) => {
    try {
      const { reservationId } = req.params;

      const reservation =
        await Reservation.findOne({
          _id: reservationId,
          user: req.user.userId,
        });

      if (!reservation) {
        return res.status(404).json({
          message: "Reservation not found",
        });
      }

      if (reservation.status !== "active") {
        return res.status(400).json({
          message:
            "Only active reservations can be cancelled",
        });
      }

      // Cancel reservation
      reservation.status = "cancelled";
      await reservation.save();

      // Make slot available
      const parkingSlot =
        await ParkingSlot.findById(
          reservation.parkingSlot
        );

      if (parkingSlot) {
        parkingSlot.status = "available";
        await parkingSlot.save();
      }

      // Increase available slots
      const parkingLot =
        await ParkingLot.findById(
          reservation.parkingLot
        );

      if (parkingLot) {
        parkingLot.availableSlots = Math.min(
          parkingLot.availableSlots + 1,
          parkingLot.totalSlots
        );

        await parkingLot.save();
      }

      if (parkingSlot) {
        io.emit("slotUpdated", parkingSlot);
      }

      if (parkingLot) {
        io.emit("lotUpdated", parkingLot);
      }

      io.emit("reservationUpdated", reservation);

      sendNotification(
        "warning",
        `Booking cancelled${parkingSlot ? ` for slot ${parkingSlot.slotNumber}` : ""}`
      );

      res.status(200).json({
        message: "Reservation cancelled successfully",
        reservation,
      });
    } catch (error) {
      console.log("Cancel Reservation Error:", error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// COMPLETE RESERVATION
// =====================================================

app.put(
  "/api/reservations/:reservationId/complete",
  authMiddleware,
  async (req, res) => {
    try {
      const { reservationId } = req.params;

      const reservation =
        await Reservation.findOne({
          _id: reservationId,
          user: req.user.userId,
        });

      if (!reservation) {
        return res.status(404).json({
          message: "Reservation not found",
        });
      }

      if (reservation.status !== "active") {
        return res.status(400).json({
          message:
            "Only active reservations can be completed",
        });
      }

      // Complete reservation
      reservation.status = "completed";
      await reservation.save();

      // Make slot available
      const parkingSlot =
        await ParkingSlot.findById(
          reservation.parkingSlot
        );

      if (parkingSlot) {
        parkingSlot.status = "available";
        await parkingSlot.save();
      }

      // Increase available slots
      const parkingLot =
        await ParkingLot.findById(
          reservation.parkingLot
        );

      if (parkingLot) {
        parkingLot.availableSlots = Math.min(
          parkingLot.availableSlots + 1,
          parkingLot.totalSlots
        );

        await parkingLot.save();
      }

      if (parkingSlot) {
        io.emit("slotUpdated", parkingSlot);
      }

      if (parkingLot) {
        io.emit("lotUpdated", parkingLot);
      }

      io.emit("reservationUpdated", reservation);

      sendNotification(
        "info",
        `Booking completed${parkingSlot ? ` for slot ${parkingSlot.slotNumber}` : ""}`
      );

      res.status(200).json({
        message: "Reservation completed successfully",
        reservation,
      });
    } catch (error) {
      console.log("Complete Reservation Error:", error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// GET ALL RESERVATIONS (MANAGER/ADMIN ONLY)
// =====================================================

app.get(
  "/api/admin/reservations",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const reservations = await Reservation.find()
        .populate("user", "name email")
        .populate("parkingLot")
        .populate("parkingSlot")
        .sort({
          createdAt: -1,
        });

      res.status(200).json({
        message: "All reservations fetched successfully",
        reservations,
      });
    } catch (error) {
      console.log("Get All Reservations Error:", error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// FEATURE 5: ADMIN ANALYTICS
// =====================================================

app.get(
  "/api/admin/analytics",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      // Booking counts by status
      const totalBookings = await Reservation.countDocuments();
      const activeBookings = await Reservation.countDocuments({
        status: "active",
      });
      const completedBookings = await Reservation.countDocuments({
        status: "completed",
      });
      const cancelledBookings = await Reservation.countDocuments({
        status: "cancelled",
      });

      // Revenue (completed + active bookings count towards revenue)
      const revenueAgg = await Reservation.aggregate([
        { $match: { status: { $in: ["active", "completed"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]);

      const totalRevenue = revenueAgg[0]?.total || 0;

      // Occupancy rate across all parking lots
      const lots = await ParkingLot.find();

      const totalSlotsAcrossLots = lots.reduce(
        (sum, lot) => sum + lot.totalSlots,
        0
      );

      const availableSlotsAcrossLots = lots.reduce(
        (sum, lot) => sum + lot.availableSlots,
        0
      );

      const occupiedSlotsAcrossLots =
        totalSlotsAcrossLots - availableSlotsAcrossLots;

      const occupancyRate =
        totalSlotsAcrossLots > 0
          ? Number(
              (
                (occupiedSlotsAcrossLots / totalSlotsAcrossLots) *
                100
              ).toFixed(1)
            )
          : 0;

      // Most-used slots (top 5 by number of reservations)
      const mostUsedSlotsAgg = await Reservation.aggregate([
        {
          $group: {
            _id: "$parkingSlot",
            bookingCount: { $sum: 1 },
          },
        },
        { $sort: { bookingCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "parkingslots",
            localField: "_id",
            foreignField: "_id",
            as: "slotInfo",
          },
        },
        { $unwind: { path: "$slotInfo", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "parkinglots",
            localField: "slotInfo.parkingLot",
            foreignField: "_id",
            as: "lotInfo",
          },
        },
        { $unwind: { path: "$lotInfo", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            slotNumber: "$slotInfo.slotNumber",
            floor: "$slotInfo.floor",
            lotName: "$lotInfo.name",
            bookingCount: 1,
          },
        },
      ]);

      res.status(200).json({
        message: "Analytics fetched successfully",
        analytics: {
          totalBookings,
          activeBookings,
          completedBookings,
          cancelledBookings,
          totalRevenue,
          occupancyRate,
          totalSlotsAcrossLots,
          availableSlotsAcrossLots,
          mostUsedSlots: mostUsedSlotsAgg,
        },
      });
    } catch (error) {
      console.log("Analytics Error:", error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =====================================================
// FEATURE 10: SUBMIT FEEDBACK / RATING
// =====================================================

app.post("/api/feedback", authMiddleware, async (req, res) => {
  try {
    const { reservationId, rating, comment } = req.body;

    if (!reservationId || !rating) {
      return res.status(400).json({
        message: "Reservation and rating are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    const reservation = await Reservation.findOne({
      _id: reservationId,
      user: req.user.userId,
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found",
      });
    }

    if (reservation.status !== "completed") {
      return res.status(400).json({
        message: "Feedback sirf completed bookings ke liye diya ja sakta hai",
      });
    }

    const existingFeedback = await Feedback.findOne({
      reservation: reservationId,
    });

    if (existingFeedback) {
      return res.status(400).json({
        message: "Is booking ke liye feedback pehle se diya ja chuka hai",
      });
    }

    const feedback = new Feedback({
      user: req.user.userId,
      reservation: reservationId,
      parkingLot: reservation.parkingLot,
      rating,
      comment: comment || "",
    });

    await feedback.save();

    sendNotification("success", "Thanks for your feedback!");

    res.status(201).json({
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (error) {
    console.log("Submit Feedback Error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// FEATURE 10: GET FEEDBACK FOR A PARKING LOT
// =====================================================

app.get("/api/feedback/:parkingLotId", async (req, res) => {
  try {
    const { parkingLotId } = req.params;

    const feedbacks = await Feedback.find({
      parkingLot: parkingLotId,
    })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    const averageRating =
      feedbacks.length > 0
        ? Number(
            (
              feedbacks.reduce((sum, fb) => sum + fb.rating, 0) /
              feedbacks.length
            ).toFixed(1)
          )
        : 0;

    res.status(200).json({
      message: "Feedback fetched successfully",
      feedbacks,
      averageRating,
      totalFeedbacks: feedbacks.length,
    });
  } catch (error) {
    console.log("Get Feedback Error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// =====================================================
// FEATURE 8: AUTOMATIC SLOT RELEASE (CRON JOB)
// =====================================================
// Har 1 minute me check karo ki koi active booking expire
// (endTime nikal chuka) to nahi hui. Agar hui hai to usko
// "completed" mark karo, slot automatically "available" kar do
// aur sabko real-time notification bhejo.

cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    const expiredReservations = await Reservation.find({
      status: "active",
      endTime: { $lte: now },
    });

    for (const reservation of expiredReservations) {
      reservation.status = "completed";
      reservation.autoReleased = true;
      await reservation.save();

      const parkingSlot = await ParkingSlot.findById(
        reservation.parkingSlot
      );

      if (parkingSlot) {
        parkingSlot.status = "available";
        await parkingSlot.save();
        io.emit("slotUpdated", parkingSlot);
      }

      const parkingLot = await ParkingLot.findById(
        reservation.parkingLot
      );

      if (parkingLot) {
        parkingLot.availableSlots = Math.min(
          parkingLot.availableSlots + 1,
          parkingLot.totalSlots
        );

        await parkingLot.save();
        io.emit("lotUpdated", parkingLot);
      }

      io.emit("reservationUpdated", reservation);

      sendNotification(
        "info",
        `Slot ${parkingSlot?.slotNumber || ""} automatically released (time expired)`
      );
    }
  } catch (error) {
    console.log("Auto Slot Release Error:", error);
  }
});

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});