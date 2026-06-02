// Phase 5 정리: RAG 함수(loadCorpus/search/canAccess) 는 폐기됨.
// 이 파일은 Phase 4 UI 컴포넌트 (Assistant.tsx / HomeAsk.tsx) 가 import 하는
// type 만 호환용으로 남겨두는 layer. agent 응답 schema 가 확정되면 함께 정리.

export type Role = "ADMIN" | "DEPT_ADMIN" | "MEMBER";
export type Scope = "GLOBAL" | "DEPARTMENT";

export interface UserContext {
  name: string;
  department: string;
  role: Role;
}

export interface DocMeta {
  id: string;
  title: string;
  type: string;
  category: string;
  owner: string;
  scope: Scope;
  department?: string;
  updatedAt?: string;
  path: string;
}

export interface Chunk {
  doc: DocMeta;
  heading: string;
  text: string;
  idx: number;
}

export interface SearchHit {
  docId: string;
  title: string;
  type: string;
  path: string;
  heading: string;
  snippet: string;
  content?: string;
  score: number;
  locked: boolean;
}
