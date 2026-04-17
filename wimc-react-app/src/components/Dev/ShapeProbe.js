import React from "react";

export default function ShapeProbe({ items, limit = 3 }) {
  if (!items?.length) return null;
  const sample = items.slice(0, limit);
  return (
    <pre
      style={{
        position: "fixed",
        bottom: 8,
        right: 8,
        padding: "8px 10px",
        background: "rgba(0,0,0,0.75)",
        color: "#fff",
        borderRadius: 8,
        maxWidth: "40vw",
        maxHeight: "40vh",
        overflow: "auto",
        zIndex: 9999,
      }}
    >
      <strong>Item keys:</strong> {Object.keys(sample[0]).join(", ")}
      {"\n\n"}
      {JSON.stringify(sample, null, 2)}
    </pre>
  );
}
