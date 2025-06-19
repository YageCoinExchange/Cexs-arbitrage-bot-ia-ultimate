import React from "react";

export default function AlertBanner({ show, message }) {
  if (!show) return null;
  return (
    <span style={{ color: "#b22222", marginLeft: 8, fontWeight: "bold" }}>
      ⚠️ {message}
    </span>
  );
}