import { imageThumb, videoPoster } from "./cloudinary";

export function normalizeItem(raw) {
  const img = raw.imageUrl || raw.link || raw.photo || raw.image || "";
  const isVideo =
    raw.mediaType === "video" ||
    (raw.mediaUrl && /\.mp4|\.mov|\.webm/i.test(raw.mediaUrl));

  const mediaType = isVideo ? "video" : "image";
  const mediaUrl = raw.mediaUrl || img || "";
  const mediaThumb = raw.mediaThumb || (!isVideo ? imageThumb(mediaUrl) : "");
  const mediaPoster = raw.mediaPoster || (isVideo ? videoPoster(mediaUrl) : "");

  return {
    id: raw.id ?? cryptoRandom(),
    name: raw.name ?? "",
    designer: raw.designer ?? "",
    size: raw.size ?? "",
    category: raw.category ?? "",

    imageUrl: raw.imageUrl,
    link: raw.link,
    photo: raw.photo,

    mediaType,
    mediaUrl,
    mediaThumb,
    mediaPoster,
  };
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10);
}
