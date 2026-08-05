-- Existing random shortcodes cannot be preserved under the ID-derived scheme.
-- The development rows were explicitly approved for deletion on 2026-08-04.
DROP TABLE "UrlCapacity";
DROP TABLE "Url";

CREATE SEQUENCE "Url_id_seq"
  AS BIGINT
  MINVALUE 1
  MAXVALUE 56800235584
  START 1
  NO CYCLE;

CREATE TABLE "Url" (
  "id" BIGINT NOT NULL DEFAULT nextval('"Url_id_seq"'),
  "originalUrl" VARCHAR(2048) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Url_pkey" PRIMARY KEY ("id")
);

ALTER SEQUENCE "Url_id_seq" OWNED BY "Url"."id";

CREATE INDEX "Url_lastAccessedAt_idx" ON "Url"("lastAccessedAt");
