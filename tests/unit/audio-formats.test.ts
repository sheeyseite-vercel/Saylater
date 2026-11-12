import { describe, expect, it } from "vitest";
import {
  audioPathFor,
  extensionFor,
  isOwnAudioPath,
  mimeFromFile,
  normalizeMime,
} from "@/features/recordings/audio-formats";

const ID = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";

describe("audio formats", () => {
  it("normalizes codec parameters", () => {
    expect(normalizeMime("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(normalizeMime("AUDIO/MP4")).toBe("audio/mp4");
  });

  it("falls back to the extension when the browser reports no type", () => {
    expect(mimeFromFile({ name: "note.m4a", type: "" })).toBe("audio/mp4");
    expect(mimeFromFile({ name: "note.MP3", type: "" })).toBe("audio/mpeg");
    expect(mimeFromFile({ name: "doc.pdf", type: "application/pdf" })).toBeNull();
  });

  it("builds the user-isolated storage path", () => {
    expect(audioPathFor("u1", ID, extensionFor("audio/mp4"))).toBe(`users/u1/recordings/${ID}/original.m4a`);
  });

  it("accepts only the caller's own audio paths", () => {
    expect(isOwnAudioPath(`users/u1/recordings/${ID}/original.webm`, "u1")).toBe(true);
    expect(isOwnAudioPath(`users/u2/recordings/${ID}/original.webm`, "u1")).toBe(false);
    expect(isOwnAudioPath(`users/u1/recordings/${ID}/original.exe`, "u1")).toBe(false);
    expect(isOwnAudioPath(`users/u1/recordings/${ID}/../x/original.webm`, "u1")).toBe(false);
    expect(isOwnAudioPath(`users/u1/recordings/not-a-uuid/original.webm`, "u1")).toBe(false);
  });
});
