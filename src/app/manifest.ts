import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SayLater",
    short_name: "SayLater",
    description: "Speak it. We'll organize it.",
    start_url: "/recordings",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e1118",
    theme_color: "#0e1118",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "New recording", short_name: "Record", url: "/capture" }],
  };
}
