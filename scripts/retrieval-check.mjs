import { search, MOCK_USER } from "../lib/rag.ts";

const ADMIN = { name: "관리자", department: "IT", role: "ADMIN" };

const fmt = (hits) =>
  hits.length
    ? hits
        .map(
          (h, i) =>
            `   ${i + 1}. [${h.score}] ${h.title} › ${h.heading}${h.locked ? " 🔒" : ""}  (${h.path})`
        )
        .join("\n")
    : "   (결과 없음)";

let failed = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "✅" : "❌"} ${label}${detail ? `  ${detail}` : ""}`);
  if (!ok) failed++;
};

console.log("=== 검색 결과 (People Ops · MEMBER) ===");
for (const q of [
  "출산휴가는 며칠이고 어떻게 신청해?",
  "재택근무 신청 어떻게 해?",
  "연차 이월 되나요?",
]) {
  console.log(`\nQ: ${q}`);
  console.log(fmt(await search(q, MOCK_USER, 3)));
}

console.log("\n=== 검증 ===");

const top = (await search("출산휴가는 며칠이야", MOCK_USER, 1))[0];
check("관련성: \"출산휴가\" top-1 = 휴가 규정", !!top && top.path.includes("leave"), top ? `→ ${top.path}` : "→ 결과 없음");

const memberSeesFinance = (await search("출장 경비 한도", MOCK_USER, 20)).some((h) =>
  h.path.includes("finance")
);
check("권한 필터: People Ops(MEMBER)는 재무팀 내부 문서 차단", !memberSeesFinance);

const adminSeesFinance = (await search("출장 경비 한도", ADMIN, 20)).some((h) =>
  h.path.includes("finance")
);
check("권한 필터: ADMIN은 재무팀 내부 문서 접근", adminSeesFinance);

console.log(`\n${failed === 0 ? "✅ 모든 검증 통과" : `❌ ${failed}건 실패`}`);
process.exit(failed === 0 ? 0 : 1);
