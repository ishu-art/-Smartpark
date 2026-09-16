import { useEffect, useState } from "react";
import { socket } from "./socket";

function ParkingSlots({ parkingLot, onBack, user }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);

  // Feature 9: Parking Floor Selection
  const [floors, setFloors] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState("all");

  // Feature 4: QR Code Booking
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // =========================
  // FETCH SLOTS
  // =========================

  const fetchSlots = async (lotId, floor = selectedFloor) => {
    try {
      setLoading(true);
      setMessage("");

      const query = floor && floor !== "all" ? `?floor=${floor}` : "";

      const response = await fetch(
        `http://localhost:5000/api/parking-slots/${lotId}${query}`
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Slots load nahi ho paye");
        return;
      }

      setSlots(data.parkingSlots || []);
      setFloors(data.floors || []);
    } catch (error) {
      console.error("Slots error:", error);
      setMessage("Server se connection nahi ho raha");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // LOAD SLOTS
  // =========================

  useEffect(() => {
    if (parkingLot?._id) {
      fetchSlots(parkingLot._id, "all");
      setSelectedFloor("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parkingLot]);

  // Floor tab change hone par slots dobara fetch karo
  const handleFloorChange = (floor) => {
    setSelectedFloor(floor);
    fetchSlots(parkingLot._id, floor);
  };

  // =========================
  // REAL-TIME UPDATES (SOCKET.IO)
  // =========================

  useEffect(() => {
    const handleSlotUpdate = (updatedSlot) => {
      if (updatedSlot.parkingLot !== parkingLot?._id) {
        return;
      }

      setSlots((prev) =>
        prev.map((slot) =>
          slot._id === updatedSlot._id ? updatedSlot : slot
        )
      );
    };

    const handleSlotCreated = (newSlot) => {
      if (newSlot.parkingLot !== parkingLot?._id) {
        return;
      }

      // Agar koi specific floor select kiya hai to us floor ke alawa slot na dikhao
      if (
        selectedFloor !== "all" &&
        Number(newSlot.floor) !== Number(selectedFloor)
      ) {
        return;
      }

      setSlots((prev) => {
        const exists = prev.some((slot) => slot._id === newSlot._id);
        if (exists) return prev;
        return [...prev, newSlot].sort((a, b) =>
          a.slotNumber.localeCompare(b.slotNumber)
        );
      });
    };

    socket.on("slotUpdated", handleSlotUpdate);
    socket.on("slotCreated", handleSlotCreated);

    return () => {
      socket.off("slotUpdated", handleSlotUpdate);
      socket.off("slotCreated", handleSlotCreated);
    };
  }, [parkingLot, selectedFloor]);

  // =========================
  // RESERVE BUTTON
  // =========================

  const handleReserveClick = (slot) => {
    setSelectedSlot(slot);
    setMessage("");
  };

  // =========================
  // CONFIRM RESERVATION
  // =========================

  const handleBooking = async () => {
    if (!startTime || !endTime) {
      setMessage("Start time aur end time select karo");
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      setMessage("End time start time ke baad hona chahiye");
      return;
    }

    try {
      setBookingLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");

      if (!token) {
        setMessage("Login token nahi mila. Please login again.");
        return;
      }

      const response = await fetch(
        "http://localhost:5000/api/reservations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            parkingLot: parkingLot._id,
            parkingSlot: selectedSlot._id,
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Reservation failed");
        return;
      }

      setMessage("Reservation successful!");

      // Feature 4: QR Code Booking — booking confirm hote hi QR dikhao
      setConfirmedBooking(data.reservation);

      setSelectedSlot(null);
      setStartTime("");
      setEndTime("");

      // Slots dobara load karo
      fetchSlots(parkingLot._id, selectedFloor);

    } catch (error) {
      console.error("Reservation error:", error);
      setMessage("Reservation ke time server error aa gaya");
    } finally {
      setBookingLoading(false);
    }
  };

  // =========================
  // UI
  // =========================

  return (
    <div className="dashboard">

      {/* NAVBAR */}

      <nav className="dashboard-navbar">

        <div className="logo">
          SmartPark
        </div>

        <div className="dashboard-user">

          <span>
            Hi, {user?.name || "User"}
          </span>

          <button
            type="button"
            onClick={onBack}
          >
            Back
          </button>

        </div>

      </nav>

      {/* MAIN CONTENT */}

      <main className="dashboard-content">

        <h1>
          {parkingLot?.name}
        </h1>

        <p>
          📍 {parkingLot?.location}
        </p>

        <p>
          ₹{parkingLot?.pricePerHour}/hr
        </p>

        <h2>
          Parking Slots
        </h2>

        {/* Feature 9: FLOOR SELECTION TABS */}
        {floors.length > 1 && (
          <div className="floor-tabs">
            <button
              type="button"
              className={`role-option ${
                selectedFloor === "all" ? "role-option-active" : ""
              }`}
              onClick={() => handleFloorChange("all")}
            >
              All Floors
            </button>

            {floors.map((floor) => (
              <button
                key={floor}
                type="button"
                className={`role-option ${
                  String(selectedFloor) === String(floor)
                    ? "role-option-active"
                    : ""
                }`}
                onClick={() => handleFloorChange(floor)}
              >
                Floor {floor}
              </button>
            ))}
          </div>
        )}

        {/* Feature 4: QR CODE CONFIRMATION */}
        {confirmedBooking && (
          <div className="parking-card qr-confirmation-card">
            <h2>✅ Booking Confirmed!</h2>
            <p>Show this QR code at the parking gate.</p>

            {confirmedBooking.qrCode && (
              <img
                src={confirmedBooking.qrCode}
                alt="Booking QR Code"
                className="qr-code-image"
              />
            )}

            <p>
              Total: <strong>₹{confirmedBooking.totalAmount}</strong>
            </p>

            <button
              type="button"
              className="ghost-button"
              onClick={() => setConfirmedBooking(null)}
            >
              Close
            </button>
          </div>
        )}

        {/* MESSAGE */}

        {message && (
          <p className="dashboard-message">
            {message}
          </p>
        )}

        {/* LOADING */}

        {loading && (
          <p className="dashboard-message">
            Loading slots...
          </p>
        )}

        {/* EMPTY */}

        {!loading &&
          slots.length === 0 &&
          !message && (
            <p className="dashboard-message">
              No parking slots found.
            </p>
          )}

        {/* SLOTS */}

        {!loading && slots.length > 0 && (
          <div className="parking-grid">

            {slots.map((slot) => {

              const isAvailable =
                slot.status === "available";

              return (
                <div
                  className={`parking-card ${
                    isAvailable ? "slot-available" : "slot-occupied"
                  }`}
                  key={slot._id}
                >

                  <h2>
                    Slot {slot.slotNumber}
                  </h2>

                  <p className="parking-location">
                    🏢 Floor {slot.floor ?? 1}
                  </p>

                  <p>
                    Status:{" "}
                    <strong>
                      {isAvailable
                        ? "AVAILABLE"
                        : "OCCUPIED"}
                    </strong>
                  </p>

                  {isAvailable ? (
                    <button
                      type="button"
                      className="reserve-button"
                      onClick={() =>
                        handleReserveClick(slot)
                      }
                    >
                      Reserve
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="reserve-button"
                      disabled
                    >
                      Occupied
                    </button>
                  )}

                </div>
              );
            })}

          </div>
        )}

        {/* RESERVATION FORM */}

        {selectedSlot && (
          <div className="parking-card">

            <h2>
              Reserve Slot {selectedSlot.slotNumber}
            </h2>

            <p>
              Select your parking time:
            </p>

            {/* START */}

            <label>
              Start Time
            </label>

            <br />

            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) =>
                setStartTime(e.target.value)
              }
            />

            <br />
            <br />

            {/* END */}

            <label>
              End Time
            </label>

            <br />

            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) =>
                setEndTime(e.target.value)
              }
            />

            <br />
            <br />

            {/* CONFIRM */}

            <button
              type="button"
              className="reserve-button"
              onClick={handleBooking}
              disabled={bookingLoading}
            >
              {bookingLoading
                ? "Booking..."
                : "Confirm Reservation"}
            </button>

            {/* CANCEL */}

            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setSelectedSlot(null);
                setStartTime("");
                setEndTime("");
                setMessage("");
              }}
            >
              Cancel
            </button>

          </div>
        )}

      </main>

    </div>
  );
}

export default ParkingSlots;