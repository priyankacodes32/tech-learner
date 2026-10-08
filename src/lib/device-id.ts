const STORAGE_KEY = "tl_device_id";

// Random id created once per browser profile. The server registers the first one a
// student plays a video from, and refuses to hand out video links to any other.
export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing && existing.length >= 16) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    // Storage blocked (private mode): fall back to a per-tab id so playback is refused
    // on the next visit rather than silently registering an unusable device.
    return ((window as unknown as { __tlDevice?: string }).__tlDevice ??= crypto.randomUUID());
  }
}
