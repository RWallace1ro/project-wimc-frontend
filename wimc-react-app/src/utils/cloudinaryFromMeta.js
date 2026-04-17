import { CLOUD_NAME } from "./constants";

export function buildImageUrl({ public_id, format, version }) {
  if (!public_id || !format) return "";

  const v = version ? `v${version}/` : "";
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${v}${public_id}.${format}`;
}

export function toThumb(url) {
  return url?.replace("/upload/", "/upload/f_auto,q_auto,w_600,c_limit/");
}
