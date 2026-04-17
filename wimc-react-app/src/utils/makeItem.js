// universal id helper
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function makeItem({ form, upload, kind }) {
  const base = {
    id: uid(),
    name: form.name || "",
    designer: form.designer || "",
    size: form.size || "",
    category: form.category || "",
    mediaType: kind,
  };

  if (kind === "image") {
    const url = upload.secure_url; // full delivery URL from Cloudinary
    const thumb = url.replace(
      "/upload/",
      "/upload/f_auto,q_auto,w_600,c_limit/",
    );
    return { ...base, mediaUrl: url, mediaThumb: thumb };
  } else {
    // video: create streaming-friendly url + poster
    const streamUrl = upload.secure_url.replace(
      "/upload/",
      "/upload/f_auto,q_auto/",
    );
    const poster =
      upload.secure_url.replace("/upload/", "/upload/so_3,du_0/") + ".jpg";
    return { ...base, mediaUrl: streamUrl, mediaPoster: poster };
  }
}
