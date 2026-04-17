const OEMBED_PROVIDERS = [
  // YouTube (no auth)
  {
    match: /https?:\/\/(www\.)?youtube\.com\/watch\?v=|https?:\/\/youtu\.be\//i,
    endpoint: (url) =>
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
        url,
      )}`,
    map: (json, url) => ({
      url,
      title: json.title || "",
      description: "",
      image: json.thumbnail_url || "",
      siteName: "YouTube",
      provider: "oembed",
    }),
  },
  // Vimeo (no auth)
  {
    match: /https?:\/\/(www\.)?vimeo\.com\//i,
    endpoint: (url) =>
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
    map: (json, url) => ({
      url,
      title: json.title || "",
      description: "",
      image: json.thumbnail_url || "",
      siteName: "Vimeo",
      provider: "oembed",
    }),
  },
  // SoundCloud (often open)
  {
    match: /https?:\/\/(www\.)?soundcloud\.com\//i,
    endpoint: (url) =>
      `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(
        url,
      )}`,
    map: (json, url) => ({
      url,
      title: json.title || "",
      description: "",
      image: json.thumbnail_url || "",
      siteName: "SoundCloud",
      provider: "oembed",
    }),
  },
];

function pickMeta(doc, ...names) {
  for (const n of names) {
    const el = doc.querySelector(`meta[property="${n}"], meta[name="${n}"]`);
    if (el?.content) return el.content.trim();
  }
  return "";
}

function parseHtmlForOg(html, url) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const title =
    pickMeta(doc, "og:title", "twitter:title") || (doc.title || "").trim();
  const description = pickMeta(
    doc,
    "og:description",
    "twitter:description",
    "description",
  );
  const image = pickMeta(doc, "og:image", "twitter:image");
  const siteName = pickMeta(doc, "og:site_name") || new URL(url).hostname;
  return { url, title, description, image, siteName, provider: "proxy" };
}

export async function fetchLinkPreview(url, opts = {}) {
  const proxyBase = opts.proxyBase || process.env.REACT_APP_OG_PROXY;

  // 1) oEmbed
  try {
    const p = OEMBED_PROVIDERS.find((p) => p.match.test(url));
    if (p) {
      const res = await fetch(p.endpoint(url));
      if (res.ok) {
        const json = await res.json();
        return p.map(json, url);
      }
    }
  } catch {}

  // 2) Proxy
  if (proxyBase) {
    try {
      const res = await fetch(`${proxyBase}?url=${encodeURIComponent(url)}`, {
        mode: "cors",
      });
      if (res.ok) {
        const type = res.headers.get("content-type") || "";
        if (type.includes("text/html")) {
          const html = await res.text();
          return parseHtmlForOg(html, url);
        }
      }
    } catch {}
  }

  //CORS may block)
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) {
      const type = res.headers.get("content-type") || "";
      if (type.includes("text/html")) {
        const html = await res.text();
        return parseHtmlForOg(html, url);
      }
    }
  } catch {}

  // Fallback minimal
  return {
    url,
    title: "",
    description: "",
    image: "",
    siteName: new URL(url).hostname,
    provider: "none",
  };
}
