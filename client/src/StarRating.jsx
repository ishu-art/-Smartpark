import { useState } from "react";

// =====================================================
// FEATURE 10: FEEDBACK / RATING (STAR COMPONENT)
// =====================================================
// readOnly = true  -> sirf display ke liye (e.g. average rating)
// readOnly = false -> user click karke rating select kar sakta hai

function StarRating({ value = 0, onChange, readOnly = false, size = 22 }) {
  const [hoverValue, setHoverValue] = useState(0);

  const displayValue = hoverValue || value;

  return (
    <div className="star-rating" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${
            star <= displayValue ? "star-filled" : "star-empty"
          }`}
          onClick={() => !readOnly && onChange && onChange(star)}
          onMouseEnter={() => !readOnly && setHoverValue(star)}
          onMouseLeave={() => !readOnly && setHoverValue(0)}
          style={{ cursor: readOnly ? "default" : "pointer" }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default StarRating;