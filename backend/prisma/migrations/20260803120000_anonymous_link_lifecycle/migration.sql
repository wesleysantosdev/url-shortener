DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Url" LIMIT 1) THEN
    RAISE EXCEPTION 'Url table must be empty before anonymous link lifecycle migration';
  END IF;
END
$$;

ALTER TABLE "Url"
  ALTER COLUMN "id" DROP DEFAULT,
  ALTER COLUMN "id" TYPE UUID USING gen_random_uuid(),
  ALTER COLUMN "shortCode" TYPE VARCHAR(8),
  ALTER COLUMN "originalUrl" TYPE VARCHAR(2048),
  ADD COLUMN "lastAccessedAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3) NOT NULL,
  ADD COLUMN "quarantinedAt" TIMESTAMP(3);

CREATE INDEX "Url_expiresAt_idx" ON "Url"("expiresAt");
CREATE INDEX "Url_quarantinedAt_idx" ON "Url"("quarantinedAt");

CREATE TABLE "UrlCapacity" (
  "key" TEXT NOT NULL DEFAULT 'global',
  "activeCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UrlCapacity_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "UrlCapacity_non_negative" CHECK ("activeCount" >= 0)
);

INSERT INTO "UrlCapacity" ("key", "activeCount", "updatedAt")
VALUES ('global', 0, CURRENT_TIMESTAMP);
