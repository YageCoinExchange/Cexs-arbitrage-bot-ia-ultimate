import React from "react";

export default function TokenReviewTimer({ lastReview }) {
  const last = new Date(lastReview);
  const now = new Date();
  const diffHours = Math.floor((now - last) / 1000 / 3600);
  return (
    <span>
      Hace {diffHours}h
      {diffHours >= 12 && (
        <span style={{ color: "orange", fontWeight: "bold", marginLeft: 6 }}>
          (¡Revisión necesaria!)
        </span>
      )}
    </span>
  );
}