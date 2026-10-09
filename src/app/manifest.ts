import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "星语星愿",
    short_name: "星语星愿",
    description:
      "一个属于年轻人的星象自我探索空间。今日星语、我的星盘、关系星图、我的星愿。",
    start_url: "/",
    display: "standalone",
    background_color: "#080a12",
    theme_color: "#080a12",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}