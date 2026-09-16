import { useEffect, useState } from "react";
import ParkingSlots from "./ParkingSlots";
import { socket } from "./socket";

function Dashboard({ user, onLogout, onViewBookings }) {
  const [parkingLots, setParkingLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selectedLot, setSelectedLot] = useState(null);

  // Search & filter state
  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);

  const fetchParkingLots = async (overrides = {}) => {
    try {
      setLoading(true);
      setMessage("");

      const activeSearch =
        overrides.search !== undefined ? overrides.search : search;
      const activeMaxPrice =
        overrides.maxPrice !== undefined
          ? overrides.maxPrice
          : maxPrice;
      const activeAvailableOnly =
        overrides.availableOnly !== undefined
          ? overrides.availableOnly
          : availableOnly;

      const params = new URLSearchParams();

      if (activeSearch.trim()) {
        params.set("search", activeSearch.trim());
      }

      if (activeMaxPrice) {
        params.set("maxPrice", activeMaxPrice);
      }

      if (activeAvailableOnly) {
        params.set("availableOnly", "true");
      }

      const query = params.toString();

      const response = await fetch(
        `http://localhost:5000/api/parking-lots${
          query ? `?${query}` : ""
        }`
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Parking lots fetch nahi ho paye"
        );
        return;
      }

      setParkingLots(data.parkingLots || []);
    } catch (error) {
      console.error("Parking lots error:", error);
      setMessage("Server se connection nahi ho raha");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParkingLots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // REAL-TIME UPDATES (SOCKET.IO)
  // =========================

  useEffect(() => {
    const handleLotChange = (updatedLot) => {
      setParkingLots((prev) => {
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

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchParkingLots();
  };

  const handleClearFilters = () => {
    setSearch("");
    setMaxPrice("");
    setAvailableOnly(false);

    fetchParkingLots({
      search: "",
      maxPrice: "",
      availableOnly: false,
    });
  };

  const handleViewSlots = (lot) => {
    setSelectedLot(lot);
  };

  const handleBack = () => {
    setSelectedLot(null);
  };

  // Selected parking lot ke slots show karo
  if (selectedLot) {
    return (
      <ParkingSlots
        parkingLot={selectedLot}
        onBack={handleBack}
        user={user}
      />
    );
  }

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
            onClick={onViewBookings}
          >
            My Bookings
          </button>

          <button
            type="button"
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

      </nav>

      {/* MAIN CONTENT */}
      <main className="dashboard-content">

        <div className="dashboard-header">

          <div>
            <h1>Find Parking</h1>

            <p>
              Choose a parking location and reserve your slot.
            </p>
          </div>

        </div>

        {/* SEARCH & FILTER */}
        <form
          className="search-filter-bar"
          onSubmit={handleSearchSubmit}
        >
          <input
            type="text"
            className="search-input"
            placeholder="Search by name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <input
            type="number"
            className="filter-input"
            placeholder="Max price/hr"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />

          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => setAvailableOnly(e.target.checked)}
            />
            Available only
          </label>

          <button type="submit" className="reserve-button">
            Search
          </button>

          <button
            type="button"
            className="ghost-button"
            onClick={handleClearFilters}
          >
            Clear
          </button>
        </form>

        {/* LOADING */}
        {loading && (
          <p className="dashboard-message">
            Loading parking locations...
          </p>
        )}

        {/* ERROR */}
        {!loading && message && (
          <p className="dashboard-message">
            {message}
          </p>
        )}

        {/* EMPTY */}
        {!loading &&
          !message &&
          parkingLots.length === 0 && (
            <div className="empty-state">

              <h2>No Parking Lots Found</h2>

              <p>
                Currently no parking locations are available.
              </p>

            </div>
          )}

        {/* PARKING LOTS */}
        {!loading &&
          parkingLots.length > 0 && (
            <div className="parking-grid">

              {parkingLots.map((lot) => (

                <div
                  className="parking-card"
                  key={lot._id}
                >

                  <div className="parking-card-header">

                    <h2>
                      {lot.name}
                    </h2>

                    <span className="parking-price">
                      ₹{lot.pricePerHour}/hr
                    </span>

                  </div>

                  <p className="parking-location">
                    📍 {lot.location}
                  </p>

                  <div className="parking-info">

                    <div>
                      <strong>
                        {lot.availableSlots}
                      </strong>

                      <span>
                        Available
                      </span>
                    </div>

                    <div>
                      <strong>
                        {lot.totalSlots}
                      </strong>

                      <span>
                        Total Slots
                      </span>
                    </div>

                  </div>

                  <div className="availability-bar">
                    <div
                      className="availability-fill"
                      style={{
                        width: `${
                          lot.totalSlots > 0
                            ? (lot.availableSlots / lot.totalSlots) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>


                  <button
                    type="button"
                    className="reserve-button"
                    disabled={lot.availableSlots === 0}
                    onClick={() => handleViewSlots(lot)}
                  >
                    {lot.availableSlots === 0
                      ? "Full"
                      : "View Slots"}
                  </button>

                </div>

              ))}

            </div>
          )}

      </main>

    </div>
  );
}

export default Dashboard;