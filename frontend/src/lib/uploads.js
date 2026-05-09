import { api } from "./api";

/**
 * Upload an image File and attach it to a POI in one step.
 * - Posts to /api/uploads/image (multipart/form-data, ≤5MB JPEG/PNG/WebP)
 * - Patches /api/pois/{id}/image with the returned permanent URL
 * - Returns the URL so the caller can update local state immediately
 *
 * Throws on validation/server errors (caller handles UX).
 */
export async function uploadPoiImage(poiId, file) {
  if (!file) throw new Error("No file provided");
  const fd = new FormData();
  fd.append("file", file);
  const upload = await api.post("/uploads/image", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  const url = upload?.data?.url;
  if (!url) throw new Error("Upload succeeded but no URL was returned");
  await api.patch(`/pois/${poiId}/image`, { image_url: url });
  return url;
}
