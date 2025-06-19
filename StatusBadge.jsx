import React from "react";

export default function StatusBadge({ active }) {
  return (
    <span style={{
      color: "#fff",
      padding: "2px 8px",
      borderRadius: 4,
      backgroundColor: active ? "green" : "gray"
    }}>
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}