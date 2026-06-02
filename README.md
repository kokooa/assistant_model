# modle — 사내 AI agent

직원이 기존 웹 채팅 UI 로 명령을 내리면 Anthropic SDK 기반 자체 agent loop 가 AXHub gateway 경유로 사내 데이터·외부 작용을 수행하는 사내 AI agent.

- **사용자 채널**: 웹 채팅 UI (`app/(app)/`, Phase 4 디자인 유지)
- **agent 코어**: `@anthropic-ai/sdk` + 자체 loop (`lib/agent/`)
- **도구/connector 호출**: 전부 `GatewayClient` 경유 → AXHub gateway → connector
- **모델 호출**: `base URL` = AXHub AI 단일 API (Anthropic Messages API 호환 가정)

상세 그림은 `axhub-agent-build-prompt.md`, `axhub-agent-refactor-report.md` 참고.

---

## 절대 규칙 (위반 시 전체 재설계)

1. Notion / Slack / Twilio / SendGrid 등 connector·provider SDK 를 앱 안에서 직접 import 금지. 전부 `GatewayClient.invoke(user, capability, args)` 경유.
2. `api.anthropic.com` 직호출 금지. Anthropic client 의 `baseURL` 옵션 = `AXHUB_AI_API_URL`.
3. `UserContext` 가 모든 호출에 관통. SSO 신원 정확히 전달이 앱의 임무 — 권한 판정은 AXHub gateway 가 한다.

---

## "나중에 AXHub 연결하기" — swap 포인트 4개

이 4개만 채우면 기능 코드 한 줄도 안 바꾸고 운영 연결이 끝난다.

| # | 위치 | 채울 값 | 효과 |
|---|---|---|---|
| 1 | `.env` `AXHUB_GATEWAY_URL` | 실제 AXHub gateway base URL | `GatewayClient` 가 stub mode 에서 실 호출 모드로 |
| 2 | `.env` `AXHUB_AI_API_URL` + `AXHUB_AI_API_KEY` | 실제 AXHub AI 단일 API endpoint + 키 | Anthropic SDK 의 `baseURL` 이 AXHub 로 향함. 빈 값일 땐 agent 가 placeholder 텍스트 emit |
| 3 | `.env` `AXHUB_CAPABILITIES` | 콤마 구분 capability 화이트리스트 (예: `notion.search,messaging.send_email`) | agent 가 그 capability 만 호출 가능. 빈 값일 땐 모든 도구 deny |
| 4 | `lib/seam/IdentityProvider.ts` | legacy session wrap → AXHub 가 주입한 검증된 헤더/JWT 파싱으로 교체 (Q3 결정 후) | `UserContext.token` 이 실제 권한 판정 가능한 값으로 |

방화벽 egress 잠금 (에이전트 서버 → AXHub gateway / AI API 외 외부 호출 차단) 은 운영 환경에서 추가.

---

## 디렉토리

```
app/
  (app)/             — 채팅 UI (Phase 4 유지, 백엔드만 갈아끼움)
  api/
    ask/route.ts     — 채팅 진입점 (agent loop 호출, NDJSON stream)
    search/route.ts  — 레거시 UI 호환 stub (빈 hits 반환)
    auth/[...nextauth]/route.ts  — next-auth (dormant)
lib/
  config/axhub.ts    — env 단일 출처
  seam/
    UserContext.ts   — 신원 산출 타입
    GatewayClient.ts — 도구/connector 호출 단일 출구 (stub mode 지원)
    AuditLogger.ts   — 구조화 로그
    IdentityProvider.ts — 세션 → UserContext 변환
  agent/
    index.ts         — Anthropic SDK 기반 agent loop (~80줄)
    tools.ts         — capability → Anthropic Tool schema
  rag.ts             — Phase 4 UI 타입 호환용 (함수 폐기, 타입만 남음)
  auth.ts, session.ts, admin.ts, prisma.ts — dormant (Q3 후 정리)
prisma/              — dormant
```

---

## 개발

```
npm install
npm run dev    # http://localhost:3000
npm run build  # webpack production 빌드
```

`.env` / `.env.local` 의 AXHUB_* 가 비어있어도 빌드는 통과. 런타임에서 `/api/ask` 호출 시 agent 는 "AXHub 미연결" placeholder 응답을 반환.

---

## 다음 단계 (Phase 5 후속)

대기 항목 (사용자가 알아올 것):
- Q3: AXHub SSO 가 modle 에 user 권한을 전달하는 형식 (JWT Bearer / 검증된 헤더 / 기타)
- C1-a 검증: AXHub LLM 게이트웨이가 실제로 Anthropic Messages API 호환인지
- C2: AXHub gateway URL + capability 목록 실 내용
- AXHub TLS 인증서 mismatch 복구 (인프라 측)

확정 후 2차 PR: IdentityProvider 실 구현 + capability schema 정의 + agent loop 단위 테스트 (TDD).
