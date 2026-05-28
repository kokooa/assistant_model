import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import { dirname } from "path";

const root = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // 상위 폴더(특히 홈 ~/package-lock.json)의 lockfile 때문에 워크스페이스 루트가
  // 홈 전체로 잘못 추론되면 dev 서버가 홈을 통째로 감시해 CPU/메모리가 폭주한다.
  // turbopack.root 와 outputFileTracingRoot 둘 다 이 디렉토리로 못박아 방지.
  turbopack: { root },
  outputFileTracingRoot: root,
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.io"],
};

export default nextConfig;
