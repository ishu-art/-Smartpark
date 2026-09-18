import { useEffect, useState } from "react";
import { socket } from "./socket";

function ManagerDashboard({ user, onLogout }) {
  const [tab, setTab] = useState("lots"); // "lots" | "bookings" | "analytics"

  const [lots, setLots] = useState([]);
  const [loadingLots, setLoadingLots] = useState(true);
  const [message, setMessage] = useState("");

  // Add Parking Lot form
  const [lotName, setLotName] = useState("");
  const [lotLocation, setLotLocation] = useState("");
  const [lotTotalSlots, setLotTotalSlots] = useState("");
  const [lotPrice, setLotPrice] = useState("");
  const [creatingLot, setCreatingLot] = useState(false);

  // Add Parking Slot form
  const [slotLotId, setSlotLotId] = useState("");
  const [slotNumber, setSlotNumber] = useState("");
  const [slotFloor, setSlotFloor] = useState("1");
  const [creatingSlot, setCreatingSlot] = useState(false);

  // All bookings
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);

  // Feature 5: Admin Analytics
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  const token = localStorage.getItem("token");

  // =========================
  // FETCH LOTS
  // =========================

  const fetchLots = async () => {
    try {
      setLoadingLots(true);

      const response = await fetch(
        "https://smartpark1-o9go.onrender.com/api/parking-lots"
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Parking lots load nahi ho paye");
        return;
      }

      setLots(data.parkingLots || []);
    } catch (error) {
      console.error("Fetch lots error:", error);
      setMessage("Server se connection nahi ho raha");
    } finally {
      setLoadingLots(false);
    }
  };

  useEffect(() => {
    fetchLots();
  }, []);

  // =========================
  // REAL-TIME UPDATES (SOCKET.IO)
  // =========================

  useEffect(() => {
    const handleLotChange = (updatedLot) => {
      setLots((prev) => {
        const exists = prev.some((lot) => lot._id === updatedLot._id);

        if (exists) {
          return prev.map((lot) =>
            lot._id === updatedLot._id ? updatedLot : lot
          );
        }

        return [updatedLot, ...prev];
      });
    };

    socket.on("lotCreated", handleLotChange);
    socket.on("lotUpdated", handleLotChange);

    return () => {
      socket.off("lotCreated", handleLotChange);
      socket.off("lotUpdated", handleLotChange);
    };
  }, []);

  useEffect(() => {
    const handleReservationChange = () => {
      // Naye/updated booking par, agar Bookings tab khula hai to list turant refresh karo
      if (tab === "bookings") {
        fetchAllReservations();
      }

      // Agar Analytics tab khula hai to stats bhi turant refresh karo
      if (tab === "analytics") {
        fetchAnalytics();
      }
    };

    socket.on("reservationCreated", handleReservationChange);
    socket.on("reservationUpdated", handleReservationChange);

    return () => {
      socket.off("reservationCreated", handleReservationChange);
      socket.off("reservationUpdated", handleReservationChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // =========================
  // CREATE PARKING LOT
  // =========================

  const handleCreateLot = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!lotName || !lotLocation || !lotTotalSlots || !lotPrice) {
      setMessage("Please fill all parking lot fields.");
      return;
    }

    try {
      setCreatingLot(true);

      const response = await fetch(
        "https://smartpark1-o9go.onrender.com/api/parking-lots",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: lotName,
            location: lotLocation,
            totalSlots: Number(lotTotalSlots),
            availableSlots: Number(lotTotalSlots),
            pricePerHour: Number(lotPrice),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Parking lot create nahi hua");
        return;
      }

      setMessage("Parking lot created successfully.");
      setLotName("");
      setLotLocation("");
      setLotTotalSlots("");
      setLotPrice("");
      fetchLots();
    } catch (error) {
      console.error("Create lot error:", error);
      setMessage("Server error aa gaya");
    } finally {
      setCreatingLot(false);
    }
  };

  // =========================
  // CREATE PARKING SLOT
  // =========================

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!slotLotId || !slotNumber) {
      setMessage("Please select a parking lot and enter a slot number.");
      return;
    }

    try {
      setCreatingSlot(true);

      const response = await fetch(
        "https://smartpark1-o9go.onrender.com/api/parking-slots",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            parkingLot: slotLotId,
            slotNumber,
            floor: Number(slotFloor) || 1,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Parking slot create nahi hua");
        return;
      }

      setMessage("Parking slot added successfully.");
      setSlotNumber("");
      setSlotFloor("1");
    } catch (error) {
      console.error("Create slot error:", error);
      setMessage("Server error aa gaya");
    } finally {
      setCreatingSlot(false);
    }
  };

  // =========================
  // FEATURE 5: FETCH ANALYTICS
  // =========================

  const fetchAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      setMessage("");

      const response = await fetch(
        "https://smartpark1-o9go.onrender.com/api/admin/analytics",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Analytics load nahi ho payi");
        return;
      }

      setAnalytics(data.analytics);
    } catch (error) {
      console.error("Fetch analytics error:", error);
      setMessage("Server se connection nahi ho raha");
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // =========================
  // FETCH ALL BOOKINGS
  // =========================

  const fetchAllReservations = async () => {
    try {
      setLoadingReservations(true);
      setMessage("");

      const response = await fetch(
        "https://smartpark1-o9go.onrender.com/api/admin/reservations",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Bookings load nahi ho payi");
        return;
      }

      setReservations(data.reservations || []);
    } catch (error) {
      console.error("Fetch reservations error:", error);
      setMessage("Server se connection nahi ho raha");
    } finally {
      setLoadingReservations(false);
    }
  };

  const handleTabChange = (nextTab) => {
    setTab(nextTab);
    setMessage("");

    if (nextTab === "bookings") {
      fetchAllReservations();
    }

    if (nextTab === "analytics") {
      fetchAnalytics();
    }
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString();
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
          <span>Hi, {user?.name || "Manager"} (Manager)</span>

          <button type="button" onClick={onLogout}>
            Logout
          </button>
        </div>

      </nav>

      {/* MAIN CONTENT */}
      <main className="dashboard-content">

        <div className="dashboard-header">
          <div>
            <h1>Manager Dashboard</h1>
            <p>Add parking lots, manage slots and track bookings.</p>
          </div>
        </div>

        {/* TABS */}
        <div className="manager-tabs">
          <button
            type="button"
            className={`role-option ${
              tab === "lots" ? "role-option-active" : ""
            }`}
            onClick={() => handleTabChange("lots")}
          >
            Parking Lots
          </button>

          <button
            type="button"
            className={`role-option ${
              tab === "bookings" ? "role-option-active" : ""
            }`}
            onClick={() => handleTabChange("bookings")}
          >
            All Bookings
          </button>

          <button
            type="button"
            className={`role-option ${
              tab === "analytics" ? "role-option-active" : ""
            }`}
            onClick={() => handleTabChange("analytics")}
          >
            Analytics
          </button>
        </div>

        {message && (
          <p className="dashboard-message">{message}</p>
        )}

        {/* ================= LOTS TAB ================= */}
        {tab === "lots" && (
          <>
            <div className="manager-forms">

              {/* ADD PARKING LOT */}
              <form className="parking-card manager-form" onSubmit={handleCreateLot}>
                <h2>Add Parking Lot</h2>

                <label>Name</label>
                <input
                  type="text"
                  placeholder="e.g. Central Mall Parking"
                  value={lotName}
                  onChange={(e) => setLotName(e.target.value)}
                />

                <label>Location</label>
                <input
                  type="text"
                  placeholder="e.g. MG Road, Mathura"
                  value={lotLocation}
                  onChange={(e) => setLotLocation(e.target.value)}
                />

                <label>Total Slots</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  value={lotTotalSlots}
                  onChange={(e) => setLotTotalSlots(e.target.value)}
                />

                <label>Price per Hour (₹)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 30"
                  value={lotPrice}
                  onChange={(e) => setLotPrice(e.target.value)}
                />

                <button
                  type="submit"
                  className="reserve-button"
                  disabled={creatingLot}
                >
                  {creatingLot ? "Adding..." : "Add Parking Lot"}
                </button>
              </form>

              {/* ADD PARKING SLOT */}
              <form className="parking-card manager-form" onSubmit={handleCreateSlot}>
                <h2>Add Parking Slot</h2>

                <label>Parking Lot</label>
                <select
                  value={slotLotId}
                  onChange={(e) => setSlotLotId(e.target.value)}
                >
                  <option value="">Select a parking lot</option>
                  {lots.map((lot) => (
                    <option value={lot._id} key={lot._id}>
                      {lot.name}
                    </option>
                  ))}
                </select>

                <label>Slot Number</label>
                <input
                  type="text"
                  placeholder="e.g. A1"
                  value={slotNumber}
                  onChange={(e) => setSlotNumber(e.target.value)}
                />

                <label>Floor</label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 1"
                  value={slotFloor}
                  onChange={(e) => setSlotFloor(e.target.value)}
                />

                <button
                  type="submit"
                  className="reserve-button"
                  disabled={creatingSlot}
                >
                  {creatingSlot ? "Adding..." : "Add Parking Slot"}
                </button>
              </form>

            </div>

            <h2 className="manager-section-title">
              All Parking Lots
            </h2>

            {loadingLots && (
              <p className="dashboard-message">Loading parking lots...</p>
            )}

            {!loadingLots && lots.length === 0 && (
              <p className="dashboard-message">
                No parking lots yet. Add one above.
              </p>
            )}

            {!loadingLots && lots.length > 0 && (
              <div className="parking-grid">
                {lots.map((lot) => (
                  <div className="parking-card" key={lot._id}>
                    <div className="parking-card-header">
                      <h2>{lot.name}</h2>
                      <span className="parking-price">
                        ₹{lot.pricePerHour}/hr
                      </span>
                    </div>

                    <p className="parking-location">📍 {lot.location}</p>

                    <div className="parking-info">
                      <div>
                        <strong>{lot.availableSlots}</strong>
                        <span>Available</span>
                      </div>

                      <div>
                        <strong>{lot.totalSlots}</strong>
                        <span>Total Slots</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ================= BOOKINGS TAB ================= */}
        {tab === "bookings" && (
          <>
            {loadingReservations && (
              <p className="dashboard-message">Loading bookings...</p>
            )}

            {!loadingReservations && reservations.length === 0 && (
              <p className="dashboard-message">
                No bookings have been made yet.
              </p>
            )}

            {!loadingReservations && reservations.length > 0 && (
              <div className="bookings-list">
                {reservations.map((reservation) => (
                  <div className="booking-card" key={reservation._id}>
                    <div className="booking-card-header">
                      <h2>{reservation.parkingLot?.name || "Parking Lot"}</h2>
                      <span
                        className={`booking-status booking-status-${reservation.status}`}
                      >
                        {reservation.status}
                      </span>
                    </div>

                    <p>
                      Driver: <strong>{reservation.user?.name || "-"}</strong> (
                      {reservation.user?.email || "-"})
                    </p>

                    <p className="parking-location">
                      📍 {reservation.parkingLot?.location || "-"}
                    </p>

                    <p>
                      Slot: <strong>{reservation.parkingSlot?.slotNumber || "-"}</strong>
                    </p>

                    <p>From: {formatDateTime(reservation.startTime)}</p>
                    <p>To: {formatDateTime(reservation.endTime)}</p>
                    <p>Total: <strong>₹{reservation.totalAmount}</strong></p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ================= ANALYTICS TAB ================= */}
        {tab === "analytics" && (
          <>
            {loadingAnalytics && (
              <p className="dashboard-message">Loading analytics...</p>
            )}

            {!loadingAnalytics && analytics && (
              <>
                <div className="analytics-grid">
                  <div className="analytics-card">
                    <strong>{analytics.totalBookings}</strong>
                    <span>Total Bookings</span>
                  </div>

                  <div className="analytics-card">
                    <strong>{analytics.activeBookings}</strong>
                    <span>Active</span>
                  </div>

                  <div className="analytics-card">
                    <strong>{analytics.completedBookings}</strong>
                    <span>Completed</span>
                  </div>

                  <div className="analytics-card">
                    <strong>{analytics.cancelledBookings}</strong>
                    <span>Cancelled</span>
                  </div>

                  <div className="analytics-card">
                    <strong>₹{analytics.totalRevenue}</strong>
                    <span>Total Revenue</span>
                  </div>

                  <div className="analytics-card">
                    <strong>{analytics.occupancyRate}%</strong>
                    <span>Occupancy Rate</span>
                  </div>
                </div>

                <h2 className="manager-section-title">
                  Most-Used Slots
                </h2>

                {analytics.mostUsedSlots.length === 0 && (
                  <p className="dashboard-message">
                    Not enough booking data yet.
                  </p>
                )}

                {analytics.mostUsedSlots.length > 0 && (
                  <div className="bookings-list">
                    {analytics.mostUsedSlots.map((slot, index) => (
                      <div className="booking-card" key={index}>
                        <div className="booking-card-header">
                          <h2>
                            {slot.lotName || "Parking Lot"} — Slot{" "}
                            {slot.slotNumber || "-"}
                          </h2>
                          <span className="booking-status booking-status-active">
                            {slot.bookingCount} bookings
                          </span>
                        </div>

                        {slot.floor !== undefined && (
                          <p>Floor: {slot.floor}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

      </main>

    </div>
  );
}

export default ManagerDashboard;
