import { useEffect, useState } from "react";
import StarRating from "./StarRating";

// =========================
// FEATURE 6: BOOKING TIMER
// =========================

function BookingTimer({ endTime }) {
  const [remaining, setRemaining] = useState(
    new Date(endTime).getTime() - Date.now()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(new Date(endTime).getTime() - Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  if (remaining <= 0) {
    return (
      <p className="booking-timer booking-timer-expired">
        ⏱ Time expired — slot will auto-release soon
      </p>
    );
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, "0");

  return (
    <p className="booking-timer">
      ⏱ Time left:{" "}
      <strong>
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </strong>
    </p>
  );
}

// =========================
// FEATURE 10: FEEDBACK FORM
// =========================

function FeedbackForm({ reservationId, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a star rating");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/feedback",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reservationId,
            rating,
            comment,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Feedback submit nahi hua");
        return;
      }

      onSubmitted();
    } catch (err) {
      console.error("Feedback error:", err);
      setError("Server error aa gaya");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-form">
      <p>Rate your parking experience:</p>

      <StarRating value={rating} onChange={setRating} />

      <textarea
        className="feedback-textarea"
        placeholder="Comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
      />

      {error && <p className="dashboard-message">{error}</p>}

      <button
        type="button"
        className="reserve-button"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Submitting..." : "Submit Feedback"}
      </button>
    </div>
  );
}

function MyBookings({ user, onLogout, onBack }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  // Feature 4: QR Code Booking
  const [qrOpenId, setQrOpenId] = useState(null);

  // Feature 10: Feedback/Rating
  const [feedbackOpenId, setFeedbackOpenId] = useState(null);
  const [feedbackGivenIds, setFeedbackGivenIds] = useState([]);

  // =========================
  // FETCH MY RESERVATIONS
  // =========================

  const fetchReservations = async () => {
    try {
      setLoading(true);
      setMessage("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/reservations",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Bookings load nahi ho payi"
        );
        return;
      }

      setReservations(data.reservations || []);
    } catch (error) {
      console.error("Bookings error:", error);
      setMessage("Server se connection nahi ho raha");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  // =========================
  // CANCEL BOOKING
  // =========================

  const handleCancel = async (reservationId) => {
    try {
      setCancellingId(reservationId);
      setMessage("");

      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/reservations/${reservationId}/cancel`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Cancel nahi ho paya");
        return;
      }

      setMessage("Booking cancelled successfully.");
      fetchReservations();
    } catch (error) {
      console.error("Cancel error:", error);
      setMessage("Server error aa gaya");
    } finally {
      setCancellingId(null);
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

          <span>
            Hi, {user?.name || "User"}
          </span>

          <button type="button" onClick={onBack}>
            Find Parking
          </button>

          <button type="button" onClick={onLogout}>
            Logout
          </button>

        </div>

      </nav>

      {/* MAIN CONTENT */}

      <main className="dashboard-content">

        <div className="dashboard-header">
          <div>
            <h1>My Bookings</h1>
            <p>
              All your parking reservations, past and present.
            </p>
          </div>
        </div>

        {message && (
          <p className="dashboard-message">
            {message}
          </p>
        )}

        {loading && (
          <p className="dashboard-message">
            Loading your bookings...
          </p>
        )}

        {!loading &&
          reservations.length === 0 &&
          !message && (
            <div className="empty-state">
              <h2>No Bookings Yet</h2>
              <p>
                Reserve a parking slot to see it here.
              </p>
            </div>
          )}

        {!loading &&
          reservations.length > 0 && (
            <div className="bookings-list">

              {reservations.map((reservation) => (
                <div
                  className="booking-card"
                  key={reservation._id}
                >

                  <div className="booking-card-header">

                    <h2>
                      {reservation.parkingLot?.name ||
                        "Parking Lot"}
                    </h2>

                    <span
                      className={`booking-status booking-status-${reservation.status}`}
                    >
                      {reservation.status}
                    </span>

                  </div>

                  <p className="parking-location">
                    📍{" "}
                    {reservation.parkingLot?.location || "-"}
                  </p>

                  <p>
                    Slot:{" "}
                    <strong>
                      {reservation.parkingSlot?.slotNumber ||
                        "-"}
                    </strong>

                    {reservation.parkingSlot?.floor !==
                      undefined && (
                      <>
                        {" "}
                        (Floor{" "}
                        {reservation.parkingSlot.floor})
                      </>
                    )}
                  </p>

                  <p>
                    From:{" "}
                    {formatDateTime(
                      reservation.startTime
                    )}
                  </p>

                  <p>
                    To:{" "}
                    {formatDateTime(
                      reservation.endTime
                    )}
                  </p>

                  <p>
                    Total:{" "}
                    <strong>
                      ₹{reservation.totalAmount}
                    </strong>
                  </p>

                  {/* FEATURE 6: BOOKING TIMER */}

                  {reservation.status === "active" && (
                    <BookingTimer
                      endTime={reservation.endTime}
                    />
                  )}

                  {/* FEATURE 4: QR CODE BOOKING */}

                  {reservation.qrCode && (
                    <>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() =>
                          setQrOpenId(
                            qrOpenId === reservation._id
                              ? null
                              : reservation._id
                          )
                        }
                      >
                        {qrOpenId === reservation._id
                          ? "Hide QR Code"
                          : "Show QR Code"}
                      </button>

                      {qrOpenId === reservation._id && (
                        <div className="qr-inline-wrapper">
                          <img
                            src={reservation.qrCode}
                            alt="Booking QR Code"
                            className="qr-code-image"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* CANCEL BOOKING */}

                  {reservation.status === "active" && (
                    <button
                      type="button"
                      className="ghost-button"
                      disabled={
                        cancellingId === reservation._id
                      }
                      onClick={() =>
                        handleCancel(reservation._id)
                      }
                    >
                      {cancellingId === reservation._id
                        ? "Cancelling..."
                        : "Cancel Booking"}
                    </button>
                  )}

                  {/* FEATURE 10: FEEDBACK / RATING */}

                  {reservation.status === "completed" &&
                    !feedbackGivenIds.includes(
                      reservation._id
                    ) && (
                      <>
                        {feedbackOpenId !==
                        reservation._id ? (
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() =>
                              setFeedbackOpenId(
                                reservation._id
                              )
                            }
                          >
                            Rate this parking
                          </button>
                        ) : (
                          <FeedbackForm
                            reservationId={
                              reservation._id
                            }
                            onSubmitted={() => {
                              setFeedbackGivenIds(
                                (prev) => [
                                  ...prev,
                                  reservation._id,
                                ]
                              );

                              setFeedbackOpenId(null);
                            }}
                          />
                        )}
                      </>
                    )}

                  {reservation.status === "completed" &&
                    feedbackGivenIds.includes(
                      reservation._id
                    ) && (
                      <p className="dashboard-message">
                        ✅ Thanks for your feedback!
                      </p>
                    )}

                </div>
              ))}

            </div>
          )}

      </main>

    </div>
  );
}

export default MyBookings;