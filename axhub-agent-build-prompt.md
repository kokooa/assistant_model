# AXHub AI 에이전트 — Claude Code 작업 프롬프트

> 이 문서를 Claude Code 첫 메시지로 붙여넣어 작업을 시작한다.
> 아래 "절대 어기면 안 되는 구조 규칙"은 `CLAUDE.md`에 옮겨 세션 간 유지한다.

## 프로젝트 목표
사내 직원용 AI 에이전트를 **TypeScript + Anthropic SDK (`@anthropic-ai/sdk`) + 자체 agent loop** 로 만든다.
이 에이전트는 사내 배포 플랫폼(AXHub) 위에 올라가는 앱이고, **직원은 기존 modle 웹 채팅 UI 를 통해 명령을 내린다.** 문자(SMS)·이메일·Slack 같은 외부 작용은 **사용자 채널이 아니라 agent 의 outbound 도구(capability)** — 사용자가 "장과장한테 회의 메일 보내줘" 같이 요청하면 agent 가 `gateway.invoke("messaging.send_email", ...)` 로 호출한다.

**왜 SDK인가:** AXHub의 "AI 단일 API"가 Anthropic Messages API 호환(가정)이라 단발 completion 만 줌. agent loop(생각 → 도구 호출 → 결과 관찰 → 재판단)·다단계 tool use·thinking 은 우리가 그 단일 API *위에* 직접 얹어야 한다. **Anthropic SDK** 는 `baseURL` 옵션으로 그 단일 API 를 향하게 만들 수 있어 thin client 로 적합. ~~`@anthropic-ai/claude-agent-sdk`~~ 는 Claude Code 의 subprocess wrapper 라서 일반 챗봇 agent 용도에 모양이 안 맞음 (정정 2026-06-02).

**역할 분담 (중요):**
- **AXHub 게이트웨이단** = 권한(authz) enforcement + Notion·Slack·HR 등 **connector 연동**을 담당한다. → 에이전트 앱은 이 connector를 *직접 구현하지 않고* 게이트웨이를 호출한다. 권한의 authoritative source도 AXHub다.
- **AXHub AI 단일 API** = 모델 completion 엔드포인트 (Anthropic Messages API 호환 가정). → `new Anthropic({ baseURL: AXHUB_AI_API_URL })` 의 base URL 이 여기를 향한다.
- **에이전트 앱(이번에 빌드)** = 오케스트레이션(SDK) + 채널 어댑터 + AXHub로의 thin 호출 계층. connector·권한·모델서빙은 전부 AXHub가 가진다.

---

## 절대 어기면 안 되는 구조 규칙 (retrofit 불가 — 위반 시 전체 재설계)

1. **에이전트/기능 코드는 connector·백엔드(Notion·Slack·HR API 등)나 모델 엔드포인트를 직접 호출하지 않는다.**
   - 모든 **도구/connector 호출**은 `GatewayClient`를 거쳐 AXHub 게이트웨이로 간다. Notion/Slack SDK를 앱에 직접 박지 않는다.
   - 모든 **모델 호출**은 SDK가 가리키는 base URL = **AXHub AI 단일 API**로만 나간다. `api.anthropic.com` 직접 호출 금지.
   - 사용자 채널: 기존 modle Next.js 채팅 UI 가 유일한 입력 채널. 진입점은 `app/api/chat/route.ts` 같은 server route 가 `(UserContext, 메시지)` 를 만들어 agent 코어로 넘긴다.
   - **아웃바운드 작용(문자/이메일/Slack 전송 등)도 `GatewayClient`/AXHub messaging connector 경유** — provider SDK(Twilio/SendGrid 등) 직접 호출 금지.

2. **`UserContext`가 모든 호출에 관통한다.** SSO/채널 신원에서 나온 `userId`, `roles`, `token`을 모든 도구 호출에 실어 보낸다. 권한 판정은 AXHub가 하므로, 앱은 *우회하지 않고 신원을 정확히 전달*하는 것이 임무다.

3. **두 평면 모두 AXHub 쪽 chokepoint를 향한다 — 앱은 그 향로(seam)를 처음부터 고정한다.**
   - **Tool plane**: 에이전트 → 도구 핸들러 → `GatewayClient` → AXHub 게이트웨이(권한 + connector). client-side는 `allowedTools` 화이트리스트 + 감사만, 실제 authz는 AXHub.
   - **Model plane**: SDK → base URL(AXHub AI 단일 API). 모델로 나가는/들어오는 데이터의 DLP·감사는 그 단일 API/AXHub단에서.

---

## 빌드 계획 (4분류)

**A. 지금 진짜로 만든다**
- `GatewayClient`: 도구/connector 호출의 단일 출구. `invoke(user, capability, args)` → 화이트리스트 확인 → audit → AXHub 게이트웨이 호출. 앱 내 유일한 백엔드 접점. (아웃바운드 메시지 발송도 이 경로.)
- `UserContext` 타입 + 모든 경로 관통 배선.
- **웹 채팅 진입점**: 기존 modle UI 의 채팅 server route 가 세션 정보로 `UserContext` 를 만들어 채널-무관 agent 코어에 `(UserContext, 메시지)` 형태로 넘기고, agent 응답을 UI 로 stream 한다. 코어는 채널을 몰라야 한다 (= 나중에 SMS inbound 가 추가돼도 코어 수정 없이 진입점만 새로 만들면 된다).
- `AuditLogger`: 채널·유저·도구·입력·결과 요약 기록. 개발 중에도 켠다.
- 자체 agent loop (`lib/agent/index.ts`): Anthropic `client.messages.create({ stream: true, tools, messages })` 호출 → `tool_use` 이벤트 오면 `GatewayClient` 위임 → tool result 를 messages 에 append 후 재호출. ~30~50 줄. allowedTools 화이트리스트 + audit 은 GatewayClient.invoke 안에서 처리.

**B. 지금 스텁 / 나중에 내용만 교체 (pluggable, 기본 pass-through)**
- `IdentityProvider` 인터페이스 + 더미: 웹 세션 정보(쿠키/헤더)를 `UserContext`로 해석. 지금은 하드코딩 유저 → 나중에 AXHub SSO (`auth_mode=required` Google OAuth 게이트 통과한 사용자 신원) 또는 axhub 가 주입한 검증된 헤더 (`X-Axhub-User-Email` 등 — Q3 결과로 확정).
- client-side `Policy`(얇게): `allowedTools` 화이트리스트 + 선택적 `inspectOutput`. authz는 AXHub가 authoritative이므로 앱쪽은 방어선 보조용으로만 둔다.

**C. 배포 때 켠다 (인프라 — 단, A의 단일 향로가 있어야 의미 있음)**
- `GatewayClient` endpoint → 실제 AXHub 게이트웨이, SDK base URL → 실제 AXHub AI 단일 API.
- `IdentityProvider` → 실제 AXHub 신원 해석.
- 네트워크 egress 화이트리스트: 에이전트 서버가 AXHub(게이트웨이 + AI 단일 API) 외부로 직접 못 나가게 잠금.

---

## seam 모양 (이 형태를 지킨다 — 순수 TS, SDK 무관)

```ts
// SSO/채널 신원 산출물. 모든 호출에 관통. (구조 — 지금 확정)
export interface UserContext {
  userId: string;
  roles: string[];
  token: string;                          // AXHub 권한 판정 / OBO 토큰 교환용
  channel: "web";                         // 1차는 웹 단일. 나중에 "sms" | "email" 추가 가능
}

// 도구/connector 호출의 유일한 출구 → AXHub 게이트웨이.
// 권한·connector 실행은 AXHub가 한다. 여기선 화이트리스트 + 감사 + 전달.
export class GatewayClient {
  constructor(
    private endpoint: string,             // 지금: AXHub 게이트웨이 스텁 URL
    private audit: AuditLogger,
    private allowed: Set<string>,         // client-side allowedTools 화이트리스트
  ) {}

  async invoke(user: UserContext, capability: string, args: unknown) {
    if (!this.allowed.has(capability)) throw new Error(`not allowed: ${capability}`);
    this.audit.log(user, "tool", capability, args);            // 지금 진짜로
    // AXHub 게이트웨이가 권한 판정 + Notion/Slack/메시지발송 등 실제 연동 수행.
    // (지금은 스텁 응답, 나중에 endpoint만 실 AXHub로 교체 — 호출부 변경 없음)
    return callAXHub(this.endpoint, user, capability, args);
  }
}

// 채널-무관 코어. 채널 어댑터가 이 형태로 정규화해서 넣는다.
export interface AgentRequest { user: UserContext; message: string; }
export interface AgentReply   { text: string; }
```

- 에이전트/도구 핸들러는 항상 `gateway.invoke(...)`만 부른다. Notion/Slack/모델/메시지 provider 직통 금지.
- SDK 커스텀 도구의 핸들러는 `gateway.invoke(user, "<capability>", args)`로 위임한다(thin proxy).
- 모델 측은 코드 함수가 아니라 **base URL = AXHub AI 단일 API**로 강제된다. 앱에 모델 키/주소를 직접 박지 않는다.

---

## 이번 세션에서 만들 것 (concrete)
- 기존 modle 의 RAG/Notion 직호출 코드 (`scripts/sync-notion.mjs`, `lib/rag.ts`, `lib/retrieve.ts`, `lib/embed.ts`, `lib/llm.ts`, `app/(app)/settings/admin/SyncControl.tsx` 등) 폐기, `@notionhq/client`/`notion-to-md` 의존성 제거. **단 Prisma + pgvector 디렉토리는 dormant 로 남김** (1차 PR 에선 import 안 함, 운명은 Q3 후 결정).
- `lib/config/axhub.ts` — env 단일 출처 (`AXHUB_GATEWAY_URL`, `AXHUB_AI_API_URL`, `AXHUB_CAPABILITIES`). 빈 값 fallback (gateway endpoint 빈 문자열 → stub, capability 빈 배열 → 모든 도구 deny).
- `lib/seam/`: `GatewayClient`(+화이트리스트, stub mode), `UserContext`, `AuditLogger`, `IdentityProvider` 더미, client-side `Policy`(얇게).
- `lib/agent/`: SDK `query` 진입점, extended thinking 활성, `PreToolUse` 훅 + audit, 도구는 `GatewayClient` 경유 thin proxy, base URL 은 `config.ai.baseUrl` 에서 읽음 (지금은 빈 문자열 → dev fallback).
- 기존 `app/(app)/` 채팅 UI 의 채팅 백엔드 (`app/api/chat/route.ts` 또는 server action) 를 agent 진입점으로 wire — 세션 → `UserContext` → agent 코어.
- `README`: "나중에 AXHub 연결하기" — 무엇을 swap하면 되는지 (4개 swap 포인트).

## 피해야 할 단 하나의 실패 패턴
"막는 건/연동은 나중에"를 **"일단 앱에 Notion·Slack SDK를 직접 박고, 모델·메시지 provider도 직통으로 부르고 `// TODO`를 단다"** 로 해석하지 말 것. 그러면 AXHub로 갈아끼울 향로가 없어 재설계해야 한다. connector·모델·발송 직통은 처음부터 금지하고, 항상 `GatewayClient` / base URL seam을 통과시킨다.

## "나중에 연결" 이 이렇게 끝나야 한다 (성공 기준)
기능 코드 한 줄도 안 건드리고:
1. `GatewayClient` endpoint → 실제 AXHub 게이트웨이
2. SDK base URL → 실제 AXHub AI 단일 API
3. `IdentityProvider` → 실제 AXHub 신원 해석
4. 방화벽 egress 잠금

이 넷으로 운영 연결이 끝난다.

## 작업 방식
- 먼저 계획(파일 구조)을 제안하고, 큰 결정은 확인받고 진행.
- 점진적으로: 스캐폴드 → GatewayClient/UserContext/Identity → 채널 어댑터+코어 → SDK 배선(thinking/훅/도구) → 엔트리포인트 → README.
- 위 "절대 규칙"을 `CLAUDE.md`에 적어 세션 간 유지.
- `@anthropic-ai/sdk` 의 TypeScript API (`new Anthropic({ baseURL, apiKey })`, `client.messages.create({ stream, tools, messages })`, `RawMessageStreamEvent` 처리, `Tool` schema) 는 node_modules d.ts 또는 docs.anthropic.com 에서 확인하고 맞춰 쓴다 — 기억에 의존하지 않는다.
- 읽기(read) 도구 우선. 쓰기(write)·발송(문자/이메일 전송 등) 도구는 별도 승인 게이트를 통과하게(명시적 확인) 둔다.
