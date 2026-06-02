# Phase 5 재구성 보고서 — modle → AXHub Agent SDK 전환

> 작업 기준 문서: `axhub-agent-build-prompt.md` (사용자가 정리한 새 방향)
> 코드 anchor: `f008784` (Phase 4 완료) → `10ef06f` (리팩토링 직전 chore)
> 진행 브랜치: `main` (별도 브랜치/태그 없이 직선 진행)

---

## 1. 한 줄 요약

**Next.js 권한 인식 RAG 챗봇 (Phase 1~4) → 기존 채팅 UI 유지 + 백엔드를 Anthropic SDK + 자체 agent loop + AXHub gateway 기반으로 교체.**
사용자 채널은 웹 채팅 UI 그대로. 외부 SaaS·모델·메시지 발송이 **전부 AXHub 게이트웨이를 단일 출구로 통과**하도록 향로(seam)를 재배치. SMS/Email 등은 사용자 채널이 아니라 agent 의 outbound capability (도구 호출).

---

## 2. 두 그림 비교

### 2.1 기존 (현재 코드 베이스라인)
```
사용자 ─[웹 UI]→ Next.js (modle)
                  ├ next-auth (Google OAuth, AXHub env 주입)
                  ├ scripts/sync-notion.mjs ─[NOTION_TOKEN]→ Notion API
                  ├ lib/embed.ts ─→ Gemini text-embedding-004
                  ├ pgvector (modle 로컬 DB)
                  └ lib/llm.ts ─→ Gemini 2.0 Flash
```
**특성:** 단일 채널(웹), 단일 응답(1-shot RAG), modle 이 토큰·코퍼스·LLM 호출 직접 소유.

### 2.2 새 그림 (사용자 의도 확정 후)
```
[직원] ─→ 기존 modle 채팅 UI (Next.js, handoff 3 디자인 유지)
            │
            ▼ POST /api/chat  (UserContext + 메시지)
         agent 코어 (Anthropic SDK + 자체 agent loop loop + extended thinking)
            │
   ┌────────┴─────────┐
   │ Tool plane       │ Model plane
   ▼                  ▼
GatewayClient    SDK base URL
   │                  │
   └→ AXHub Gateway   └→ AXHub AI 단일 API
       ├ connectors      (Anthropic 호환 가정)
       │  ├ notion.search
       │  ├ messaging.send_email / send_sms / slack.post   ← outbound 도구
       │  └ hr.lookup …
       ├ authz
       └ audit
```
**특성:** 단일 사용자 채널(웹), agent loop (생각→도구 호출→관찰→재판단), 앱은 connector·모델·메시지 발송을 직접 안 함. SMS/Email 발송은 사용자 입력이 아니라 agent 가 도구로 호출.

---

## 3. AXHub 지식 기반 검증 — 사용자 가정과의 정합성

문서가 그린 그림은 깨끗하지만, **AXHub 실제 동작에 대해 내가 가진 evidence 와 어긋나는 가정이 4개** 있어요. 본격 빌드 전에 사용자가 확인해줘야 할 항목들.

| # | 사용자 문서의 가정 | 내 evidence (`project_modle.md` 정정 기록, 2026-05-28) | 가능한 해석 |
|---|---|---|---|
| C1 | **"AXHub AI 단일 API"** 가 모델 completion 엔드포인트로 존재 | ~~"axhub apis list 결과 = 공용 데이터 API + GKE 비용 계산기 7개"~~ → **재정정 (2026-06-02): 사용자 확인 — LLM 게이트웨이 존재함.** | **확정.** SDK base URL 을 `AXHUB_AI_API_URL` 로 향하게 함 |
| C1-a | LLM 게이트웨이의 API 호환 형식 (Anthropic / OpenAI / 자체 schema) | 미확인 | **사용자 결정 (2026-06-02): Anthropic 호환 가정으로 진행.** 다른 형식이면 그 시점에 `src/ai-adapter/` 추가 |
| C2 | **AXHub 가 Notion / Slack / HR connector** 를 호출 가능한 API 로 노출 | `axhub apis list` 7개에 그런 connector 가 있었는지 미확인 (3일 전 시점) | 카탈로그 재확인 필요. 있으면 GatewayClient endpoint 결정 가능 |
| C3 | **SMS / 이메일 인바운드 webhook** 을 받을 endpoint 가 modle 쪽 | axhub `auth_mode=required` 는 인터랙티브 OAuth 게이트라 webhook 과 충돌 (Google 로그인 강제) | webhook 전용 path 는 `auth_mode=optional` 또는 `none` 으로 별도 노출 필요. axhub 가 raw webhook 통과시키는지 미확인 |
| C4 | **IdentityProvider 가 AXHub단 신원 검증** 에 위임 | 현재 알려진 AXHub 신원 메커니즘 = Google OAuth (jocodingax.ai hd 강제). SMS/email 발신자를 회사 직원으로 매핑하는 메커니즘은 별도 | 휴대폰/이메일 → user id 매핑 테이블이 AXHub 안에 있나? 없으면 modle 이 들고 있어야 함 |

**선결 권장:** C1, C2 는 빌드 시작 전 반드시 확인. C3, C4 는 채널 어댑터 구체 구현 전까지는 미뤄도 OK.

확인 방법 (TLS 이슈 해결 후):
- `axhub apis list --json` — connector / AI 카탈로그 재확인
- `axhub whatsnew` — LLM 게이트웨이 / messaging connector 출시 여부
- `axhub auth_mode` 옵션 — webhook lane 존재 여부

---

## 4. 기존 modle 코드의 운명 — 구체 파일 단위

### 4.1 폐기 (새 아키텍처에 자리 없음)
| 파일/디렉토리 | 사유 |
|---|---|
| `lib/rag.ts`, `lib/retrieve.ts`, `lib/embed.ts` | 임베딩·retrieve 책임이 AXHub 로 이관 |
| `lib/llm.ts` (Gemini) | base URL 이 AXHub AI 단일 API 로 강제 (C1 확정, Anthropic 호환 가정) |
| `scripts/sync-notion.mjs`, `notion-pages.mjs`, `notion-query.mjs` | Notion 직접 호출 금지 (절대 규칙 #1) |
| `scripts/embed-check.mjs`, `retrieval-check.mjs`, `ask-check.mjs`, `scope-check.mjs` | 로컬 RAG 검증 스크립트 — 새 검증으로 대체 |
| `app/(app)/settings/admin/SyncControl.tsx` | Notion 직접 sync UI |
| `package.json` 의 `@notionhq/client`, `notion-to-md` | Notion SDK 직호출 금지 |
| `.env` / `.env.local` 의 `NOTION_TOKEN`, `GEMINI_API_KEY` | 위 폐기에 종속 |

### 4.2 유지 (백엔드만 갈아끼움)
| 자산 | 사유 |
|---|---|
| **`app/(app)/` 전체 채팅 UI** | handoff 3 디자인 그대로. 백엔드만 agent SDK 진입으로 wire |
| **`app/login/`** | axhub `auth_mode=required` 게이트와의 관계는 Q3 후 정리 (당분간 유지) |
| **`app/(app)/settings/admin/`** 의 부서·유저 카드 | sync 카드만 빠지고 나머지 유지 |
| **디자인 토큰, Tailwind, globals.css, tokens.css** | UI 유지에 필요 |
| **`@anthropic-ai/sdk` 0.100.1** | 이미 peerDep 으로 설치됨. `baseURL` 옵션으로 AXHub AI 단일 API 향함 |
| **`next`, `react`, `react-dom`, `typescript`, `eslint`** | UI 유지로 그대로 |
| **계획서.md, 진행상황.md** | Phase 5 섹션 추가 |

### 4.3 Dormant (1차 PR 에서 손 안 댐)
| 자산 | 1차 PR 정책 | 운명 결정 시점 |
|---|---|---|
| `prisma/` (schema + migrations + seed) | 디렉토리 유지, import 안 함 | Q3 (SSO 형식) 후 — user/audit 캐시용으로 살릴지 결정 |
| `@prisma/client`, `prisma` 의존성 | package.json 에 남김 | 〃 |
| 로컬 PostgreSQL | 손 안 댐 | 〃 |
| `lib/prisma.ts`, `lib/session.ts`, `lib/auth.ts`, `lib/admin.ts` | next-auth 흐름은 당분간 유지 | Q3 결과로 일괄 정리 |
| `auth.ts`, `auth.config.ts` | 〃 | 〃 |

### 4.4 신규 추가
| 위치 | 역할 |
|---|---|
| `lib/config/axhub.ts` | env 단일 출처 (gateway URL / AI baseUrl / capability list) |
| `lib/seam/UserContext.ts` | 신원 산출 타입 |
| `lib/seam/GatewayClient.ts` | 도구/connector 호출 단일 출구 (endpoint="" → stub mode) |
| `lib/seam/AuditLogger.ts` | 구조화 로그 (지금은 console) |
| `lib/seam/IdentityProvider.ts` | 세션 → UserContext 변환 (dummy 우선) |
| `lib/agent/index.ts` | Anthropic `client.messages.create({ stream, tools, messages })` 기반 agent loop, tool_use 시 GatewayClient 위임 후 재호출 |
| `lib/agent/tools.ts` | capability 화이트리스트 → Anthropic Tool schema 변환 |
| `app/api/chat/route.ts` 또는 동등 server action | 채팅 UI ↔ agent 진입점 |
| `README` 의 "AXHub 연결 swap 포인트 4개" 섹션 | 운영 swap 가이드 |

---

## 5. 진행 전략 — 결정

같은 repo `main` 진행 + 기존 UI 유지가 확정됨. 새 디렉토리 (`src/`) 대신 **기존 `lib/` 안에 `lib/seam/`, `lib/agent/`, `lib/config/` 서브디렉토리 추가**로 가는 게 자연스러움 (UI 가 `app/` 안에서 `@/lib/*` 를 import 하는 기존 import alias 그대로 활용).

**1차 PR 범위:**
1. 폐기 (§4.1) — `git rm` + `package.json` 의존성 정리 + `.env*` 키 정리
2. `lib/config/axhub.ts` — env 단일 출처
3. `lib/seam/` — `UserContext`, `GatewayClient`(stub), `AuditLogger`, `IdentityProvider`(dummy)
4. `lib/agent/` — SDK `query` 진입점, extended thinking on, `PreToolUse` 훅, capability proxy
5. `app/api/chat/route.ts` (또는 기존 채팅 백엔드) 갈아끼움 — agent 진입점 wire
6. `README` — "AXHub 연결 swap 포인트 4개" 문서화

Dormant (§4.3) 자산은 손 안 댐.

---

## 6. 즉시 시작 가능 vs 대기

### 6.1 지금 시작 가능 (C2~C4 / Q3 미확정이어도 안전)
- 1차 PR 의 6개 항목 전부. `GatewayClient` 가 stub mode 라 endpoint 몰라도 됨. capability 화이트리스트 비면 PreToolUse 가 모든 도구 deny → agent 는 LLM-only 응답만. base URL 빈 문자열이면 dev fallback (로컬 stub).

### 6.2 대기 (사실 확정 필요)
- `config.gateway.endpoint` 의 실제 URL — C2 의존 (AXHub gateway URL)
- `config.ai.baseUrl` 의 실제 URL — C1 확정됨, URL 자체는 사용자 확인 필요
- `config.capabilities` 실 내용 — C2 의존 (AXHub 가 노출하는 capability 목록)
- `IdentityProvider` 실 구현 — Q3 의존 (SSO 형식: JWT / 검증된 헤더 / 기타)
- `lib/auth.ts`, `auth.ts` 등 next-auth 흐름 운명 — Q3 의존
- Prisma + pgvector 운명 — Q3 후 일괄 결정 (user/audit 캐시로 살릴지)
- AI adapter (`src/ai-adapter/`) — C1-a Anthropic 호환이 아니라 OpenAI/자체 schema 로 밝혀지면 추가 (지금은 가정으로 진행)

---

## 7. 결정 기록 (이 세션에서 확정)

- **C1**: AXHub LLM 게이트웨이 존재함. 5-28 시점 "없음" 정정은 잘못이었음. base URL = `AXHUB_AI_API_URL`.
- **C1-a**: Anthropic API 호환 proxy 로 가정하고 진행. 다른 형식이면 그 시점에 `src/ai-adapter/` 추가 (수백 줄).
- **사용자 채널**: 웹 채팅 UI 1개. SMS/Email 은 outbound capability (도구 호출).
- **진행 전략**: A (clean slate) 정신이지만 UI 유지로 폐기 범위 §4.1 만. 새 디렉토리 `src/` 안 만들고 기존 `lib/` 안에 `lib/seam/`, `lib/agent/`, `lib/config/` 추가.
- **1차 PR 범위**: §5 의 6개 항목 한 묶음.
- **Prisma + 로컬 PostgreSQL**: 1차 PR 에서 dormant. Q3 후 결정.
- **`lib/llm.ts` (Gemini)**: 1차 PR 에서 폐기 (C1 확정 + A 호환 가정).

## 8. 대기 중 (사용자 알아올 것)

- **Q3** SSO 형식 — JWT Bearer / 검증된 헤더 / 기타
- **C2** AXHub gateway URL + connector capability 목록 (Notion·HR·messaging 등 실제 capability id)
- **C1-a 검증** — AXHub LLM 게이트웨이의 실제 API schema 가 Anthropic 호환인지 확인 (지금은 가정)
- AXHub TLS 인증서 mismatch 복구 (인프라 측 이슈)

확정되면 §6.2 대기 항목들로 2차 PR.
