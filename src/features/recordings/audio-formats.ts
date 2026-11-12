// Shared by client and server. Keep free of server-only imports.

export const ALLOWED_MIME_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/wave",
  "audio/aac",
  "audio/flac",
  "video/webm", // some Chromium builds label audio-only WebM this way
] as const;

export type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_TO_EXT: Record<AllowedMime, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/aac": "aac",
  "audio/flac": "flac",
  "video/webm": "webm",
};

const EXT_TO_MIME: Record<string, AllowedMime> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  aac: "audio/aac",
  flac: "audio/flac",
};

export const ALLOWED_EXTENSIONS = ["webm", "ogg", "m4a", "mp3", "wav", "aac", "flac"] as const;

/** "audio/webm;codecs=opus" -> "audio/webm" */
export function normalizeMime(type: string): string {
  return (type.split(";")[0] ?? "").trim().toLowerCase();
}

export function isAllowedMime(type: string): type is AllowedMime {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(type);
}

export function extensionFor(mime: AllowedMime): string {
  return MIME_TO_EXT[mime];
}

/** Some browsers leave File.type empty (notably for .m4a), so fall back to the extension. */
export function mimeFromFile(file: { name: string; type: string }): AllowedMime | null {
  const fromType = normalizeMime(file.type);
  if (isAllowedMime(fromType)) return fromType;
  const ext = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : undefined;
  return (ext && EXT_TO_MIME[ext]) || null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: string) => UUID_RE.test(v);

export function audioPathFor(uid: string, recordingId: string, ext: string): string {
  return `users/${uid}/recordings/${recordingId}/original.${ext}`;
}

/** True only for `users/{uid}/recordings/{uuid}/original.{allowed ext}` with the caller's own uid. */
export function isOwnAudioPath(path: string, uid: string): boolean {
  const parts = path.split("/");
  if (parts.length !== 5) return false;
  const [users, owner, recordings, recordingId, file] = parts;
  if (users !== "users" || owner !== uid || recordings !== "recordings") return false;
  if (!recordingId || !isUuid(recordingId)) return false;
  const m = /^original\.([a-z0-9]+)$/.exec(file ?? "");
  return Boolean(m && m[1] && (ALLOWED_EXTENSIONS as readonly string[]).includes(m[1]));
}
