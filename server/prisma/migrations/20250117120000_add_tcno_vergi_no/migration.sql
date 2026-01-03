-- Business tablosuna TC ve Vergi No ekle
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "tcNo" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "vergiNo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Business_tcNo_key" ON "Business"("tcNo") WHERE "tcNo" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Business_vergiNo_key" ON "Business"("vergiNo") WHERE "vergiNo" IS NOT NULL;

