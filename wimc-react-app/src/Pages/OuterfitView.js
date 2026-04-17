import React from "react";

export default function OutfitView() {
  const [outfit, setOutfit] = React.useState(null);
  const [status, setStatus] = React.useState("loading"); // loading | done | error

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const src = url.searchParams.get("src");
    if (!src) {
      setStatus("error");
      return;
    }

    (async () => {
      try {
        const res = await fetch(src, { cache: "no-store" });
        if (!res.ok) throw new Error("Fetch failed");
        const json = await res.json();
        setOutfit(json);
        setStatus("done");
      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    })();
  }, []);

  if (status === "loading")
    return <div className="outfit-view">Loading outfit…</div>;
  if (status === "error")
    return (
      <div className="outfit-view">
        Sorry, this outfit link is invalid or expired.
      </div>
    );

  return (
    <section className="outfit-view">
      <h1 className="outfit-view__title">Outfit</h1>
      <div className="outfit-view__grid">
        {outfit.items.map((it, idx) => (
          <figure className="outfit-view__card" key={idx}>
            {it.mediaType === "video" ? (
              <video
                className="outfit-view__video"
                controls
                poster={it.mediaPoster}
                width="300"
              >
                <source src={it.mediaUrl} />
              </video>
            ) : (
              <img
                className="outfit-view__image"
                src={it.mediaThumb || it.mediaUrl}
                alt={it.name}
                width="300"
                loading="lazy"
              />
            )}
            <figcaption className="outfit-view__caption">
              <strong>{it.name}</strong>
              <br />
              {it.designer} • {it.size} • {it.category}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
