import { search, MOCK_USER } from "../lib/rag.ts";
import { streamGroundedAnswer } from "../lib/llm.ts";

// dev 서버 없이 RAG → LLM 근거 기반 생성을 직접 검증.
// 사용: node scripts/ask-check.mjs "질문"
const q = process.argv[2] ?? "출산휴가는 며칠이고 어떻게 신청해? 분할 사용 돼?";

const hits = await search(q, MOCK_USER, 6);
console.log(`Q: ${q}\n`);
console.log("출처(top-k):");
hits.forEach((h, i) => console.log(`  [${i + 1}] ${h.title} › ${h.heading}`));
process.stdout.write("\n답변:\n");
for await (const delta of streamGroundedAnswer(q, hits)) process.stdout.write(delta);
console.log("\n");
