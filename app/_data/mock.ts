import type { IconName } from "../_components/icons";

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  group: "workspace" | "knowledge" | "more";
  href: string;
  badge?: string;
}

export const NAV: NavItem[] = [
  { id: "home", label: "물어보기", icon: "sparkle", group: "workspace", href: "/", badge: "AI" },
  { id: "sources", label: "지식 소스", icon: "database", group: "workspace", href: "/sources" },
  { id: "hr", label: "HR · 휴가", icon: "umbrella", group: "knowledge", href: "/sources?cat=hr" },
  { id: "work", label: "근무 규정", icon: "doc", group: "knowledge", href: "/sources?cat=work" },
  { id: "welfare", label: "복지", icon: "heart", group: "knowledge", href: "/sources?cat=welfare" },
  { id: "safety", label: "안전 매뉴얼", icon: "shield", group: "knowledge", href: "/sources?cat=safety" },
  { id: "notices", label: "공지", icon: "megaphone", group: "more", href: "/sources?cat=notice", badge: "3" },
  { id: "settings", label: "설정", icon: "settings", group: "more", href: "/sources?cat=settings" },
];

export interface SuggestedPrompt {
  icon: IconName;
  label: string;
}

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { icon: "umbrella", label: "출산휴가는 며칠이야?" },
  { icon: "doc", label: "재택근무 신청 어떻게 해?" },
  { icon: "calendar", label: "연차 이월 되나요?" },
  { icon: "heart", label: "경조사 휴가 규정 알려줘" },
];

export interface RecentConversation {
  id: string;
  title: string;
  snippet: string;
  cat: string;
  time: string;
}

export const RECENT_CONVERSATIONS: RecentConversation[] = [
  { id: "c1", title: "출산휴가 일수와 신청 절차", snippet: "출산휴가는 90일, 분할 사용은…", cat: "HR", time: "10분 전" },
  { id: "c2", title: "재택근무 가능 일수", snippet: "주 2일까지, 팀장 승인 후…", cat: "근무", time: "1시간 전" },
  { id: "c3", title: "복지 포인트 사용처", snippet: "연 120만 포인트, 도서·건강…", cat: "복지", time: "어제" },
];

export const BRIEFING_LINES: string[] = [
  "이번 분기 휴가 정책이 5월 1일자로 개정됐어요 — 연차 이월 한도가 바뀌었어요.",
  "내 부서(People Ops) 권한으로 47개 정책 문서를 검색할 수 있어요.",
  "최근 3건의 대화에서 휴가·근무 규정을 주로 찾아봤어요.",
];

export interface Thread {
  id: string;
  title: string;
  snippet: string;
  cat: string;
}

export const THREADS_TODAY: Thread[] = [
  { id: "t1", title: "출산휴가 일수와 신청 절차", snippet: "출산휴가는 90일, 분할 사용은…", cat: "HR" },
  { id: "t2", title: "재택근무 가능 일수", snippet: "주 2일까지, 팀장 승인 후…", cat: "근무" },
];
export const THREADS_WEEK: Thread[] = [
  { id: "t3", title: "복지 포인트 사용처", snippet: "연 120만 포인트, 도서·건강…", cat: "복지" },
  { id: "t4", title: "경조사 휴가 며칠인가요", snippet: "본인 결혼 5일, 직계 사망 5일…", cat: "HR" },
  { id: "t5", title: "병가 진단서 필요 기준", snippet: "3일 이상 연속 시 제출…", cat: "근무" },
];
export const THREADS_OLDER: Thread[] = [
  { id: "t6", title: "경비 처리 한도", snippet: "국내 출장 식대 3만/일…", cat: "경비" },
  { id: "t7", title: "사내 교육 신청 방법", snippet: "러닝 플랫폼에서 분기별…", cat: "교육" },
];

export interface SourceDoc {
  n: number;
  title: string;
  type: string;
  path: string;
  locked: boolean;
  rel: number;
}

export const SOURCES: SourceDoc[] = [
  { n: 1, title: "휴가 규정 — 법정·약정 휴가 종합", type: "정책", path: "hr/leave/leave-policy-v3.md", locked: true, rel: 0.95 },
  { n: 2, title: "출산·육아 지원 가이드 (FY26)", type: "정책", path: "hr/parental/fy26-guide.pdf", locked: true, rel: 0.9 },
  { n: 3, title: "임직원 핸드북 — 휴가 신청", type: "위키", path: "handbook/leave#apply", locked: false, rel: 0.83 },
  { n: 4, title: "근태·휴가 시스템 사용법", type: "안내", path: "guides/attendance-system.md", locked: false, rel: 0.72 },
];

export interface Perm {
  label: string;
  scope: string;
}

export const PERMS: Perm[] = [
  { label: "HR 정책 문서", scope: "전사 공개 + People Ops" },
  { label: "휴가·근태 규정", scope: "전 임직원 열람 가능" },
  { label: "부서 내부 안내", scope: "내 부서: People Ops" },
  { label: "개인 근태 기록", scope: "본인 + 직속 관리자만" },
];

export const FOLLOWUPS: string[] = [
  "출산휴가 중에 급여는 어떻게 돼?",
  "배우자 출산휴가도 있어?",
  "휴가 신청은 어디서 해?",
  "연차랑 같이 붙여 쓸 수 있어?",
];
