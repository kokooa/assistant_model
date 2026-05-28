import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import { dirname } from "path";

const root = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // 상위 폴더의 package-lock.json 때문에 워크스페이스 루트가 잘못 추론되는 것 방지
  turbopack: { root },
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.io"],
};

export default nextConfig;
