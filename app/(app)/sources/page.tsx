"use client";

import { useRouter } from "next/navigation";
import { I, type IconName } from "@/app/_components/icons";

interface KnowledgeDoc {
  title: string;
  cat: string;
  icon: IconName;
  type: string;
  owner: string;
  pages: number;
  reviewed: string;
  indexed: boolean;
  locked: boolean;
}

const DOCS: KnowledgeDoc[] = [
  { title: "휴가 규정 — 법정·약정 휴가 종합", cat: "HR", icon: "umbrella", type: "정책", owner: "People Ops", pages: 24, reviewed: "12일 전 검토", indexed: true, locked: true },
  { title: "출산·육아 지원 가이드 (FY26)", cat: "HR", icon: "umbrella", type: "정책", owner: "People Ops", pages: 18, reviewed: "30일 전 검토", indexed: true, locked: true },
  { title: "근무 규정 — 근태·재택·유연근무", cat: "근무", icon: "doc", type: "정책", owner: "People Ops", pages: 31, reviewed: "8일 전 검토", indexed: true, locked: false },
  { title: "임직원 핸드북", cat: "근무", icon: "folder", type: "위키", owner: "People Ops", pages: 86, reviewed: "어제 검토", indexed: true, locked: false },
  { title: "복지 제도 안내 — 복지 포인트·건강검진", cat: "복지", icon: "heart", type: "안내", owner: "Total Rewards", pages: 12, reviewed: "5일 전 검토", indexed: true, locked: false },
  { title: "경비·출장 처리 규정", cat: "경비", icon: "doc", type: "정책", owner: "Finance", pages: 22, reviewed: "21일 전 검토", indexed: true, locked: true },
  { title: "안전 매뉴얼 — 사고·비상 대응 SOP", cat: "안전", icon: "shield", type: "매뉴얼", owner: "EHS", pages: 40, reviewed: "3일 전 검토", indexed: false, locked: true },
];

const CATS = ["전체", "HR", "근무", "복지", "경비", "안전"];

export default function SourcesPage() {
  const router = useRouter();

  return (
    <div className="page">
      <div className="page-inner">
        <div className="page-head">
          <div>
            <h1 className="page-title">지식 소스</h1>
            <p className="page-sub">
              modle이 답변에 사용하는 사내 문서예요. 권한 범위 안의 문서만 검색·인용해요.
            </p>
          </div>
          <button className="btn btn-acc" onClick={() => router.push("/")}>
            {I.sparkle({ size: 14 })} 물어보기
          </button>
        </div>

        <div className="hero-prompts" style={{ marginBottom: 18 }}>
          {CATS.map((c, i) => (
            <button
              key={c}
              className="prompt-chip"
              style={i === 0 ? { borderColor: "var(--acc)", color: "var(--acc-ink)" } : undefined}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">{I.database({ size: 14 })} 색인된 문서</div>
            <span className="card-meta">{DOCS.length}개</span>
          </div>
          <div>
            {DOCS.map((d) => (
              <div key={d.title} className="doc-item" onClick={() => router.push(`/?q=${encodeURIComponent(d.title + " 알려줘")}`)}>
                <div className="doc-thumb">{I[d.icon]({ size: 14 })}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="doc-title">
                    {d.title}
                    {d.locked && <span style={{ marginLeft: 6, color: "oklch(0.45 0.1 70)", verticalAlign: "middle", display: "inline-flex" }}>{I.lock({ size: 11 })}</span>}
                  </div>
                  <div className="doc-meta">
                    <span>{d.cat}</span>
                    <span>{d.type}</span>
                    <span>{d.owner}</span>
                    <span>{d.pages}쪽</span>
                    <span>{d.reviewed}</span>
                  </div>
                </div>
                <span className={`tag ${d.indexed ? "ok" : "warn"}`}>
                  {d.indexed ? "색인됨" : "색인 대기"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
