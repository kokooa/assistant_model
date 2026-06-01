-- pgvector + Notion 청크 색인 테이블.
-- 기존 환경(이 마이그레이션 도입 전에 수동 생성한 경우)은
--   npx prisma migrate resolve --applied 20260601090000_chunks_pgvector
-- 로 적용 완료 표시만 해 주면 된다. 새 환경은 prisma migrate deploy 가 처리.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "chunks" (
  "id"          serial PRIMARY KEY,
  "doc_id"      text NOT NULL,
  "doc_title"   text NOT NULL,
  "doc_url"     text,
  "heading"     text,
  "content"     text NOT NULL,
  "block_id"    text,
  "scope"       text NOT NULL DEFAULT 'GLOBAL',
  "department"  text,
  "embedding"   vector(768),
  "updated_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "chunks_doc_idx" ON "chunks" ("doc_id");
CREATE INDEX IF NOT EXISTS "chunks_embedding_idx"
  ON "chunks" USING hnsw ("embedding" vector_cosine_ops);
