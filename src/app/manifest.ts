import type { MetadataRoute } from "next";

// Lets members add mhs.alumni to their phone's home screen and open it like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "mhs.alumni: Menyenya SDA High School Alumni",
    short_name: "mhs.alumni",
    description: "Stay connected to Menyenya, support current students and grow with a trusted alumni network.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f7f4",
    theme_color: "#17283b",
    categories: ["social", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My dashboard", url: "/app" },
      { name: "Member directory", url: "/app/directory" },
      { name: "Make a pledge", url: "/pledge/tuition-block" },
    ],
  };
}
