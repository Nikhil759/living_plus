import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Living+",
    short_name: "Living+",
    description: "Your society, your neighbours, your Living+.",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#FBFBFD",
    theme_color: "#FBFBFD",
    icons: [
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
