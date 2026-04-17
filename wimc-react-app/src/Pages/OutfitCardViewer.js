import React, { useEffect, useState } from "react";

export default function OutfitCardViewer() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    const url = new URL(window.location.href);
    const src = url.searchParams.get("src");
    if (!src) {
      setErr("Missing ?src= parameter");
      return;
    }
    let ignore = false;
    (async () => {
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!ignore) setData(json);
      } catch (e) {
        console.error(e);
        if (!ignore) setErr("Could not load card.");
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  if (err) return <main style={{ padding: 16 }}>{err}</main>;
  if (!data) return <main style={{ padding: 16 }}>Loading…</main>;

  const groups = (data.items || []).reduce((acc, it) => {
    const k = it.section || "Uncategorized";
    (acc[k] ||= []).push(it);
    return acc;
  }, {});
  const note = data.note;

  return (
    <main
      style={{
        padding: 24,
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0 }}>Outfit Card</h1>
        <button onClick={() => window.print()} style={{ marginLeft: "auto" }}>
          Print
        </button>
      </header>
      <div style={{ color: "#555", fontSize: 12, marginBottom: 12 }}>
        Created: {new Date(data.createdAt || Date.now()).toLocaleString()} •
        Items: {data.items?.length || 0}
      </div>
      {note && (
        <section
          style={{
            background: "#fafafa",
            border: "1px solid #eee",
            borderRadius: 8,
            padding: 10,
            margin: "8px 0 16px",
            whiteSpace: "pre-wrap",
          }}
        >
          {note}
        </section>
      )}
      {Object.entries(groups).map(([section, items]) => (
        <section key={section} style={{ marginBottom: 18 }}>
          <h2 style={{ fontSize: 16, margin: "0 0 8px", color: "#333" }}>
            {section}
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
            }}
          >
            {items.map((it, i) => (
              <figure
                key={i}
                style={{
                  margin: 0,
                  padding: 6,
                  border: "1px solid #eee",
                  borderRadius: 8,
                  background: "#fff",
                }}
              >
                <img
                  alt={it.name || "item"}
                  src={
                    it.mediaType === "video"
                      ? it.mediaPoster || ""
                      : it.mediaThumb || it.mediaUrl
                  }
                  style={{
                    width: "100%",
                    height: 180,
                    objectFit: "contain",
                    display: "block",
                  }}
                />
                <figcaption
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    color: "#444",
                    marginTop: 6,
                    minHeight: 14,
                  }}
                >
                  {it.name || (it.mediaType === "video" ? "Video" : "")}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
