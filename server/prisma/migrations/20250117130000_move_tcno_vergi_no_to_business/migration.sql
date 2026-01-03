-- User tablosundan TC ve Vergi No alanlarını kaldır (eğer varsa)
ALTER TABLE "User" DROP COLUMN IF EXISTS "tcNo";
ALTER TABLE "User" DROP COLUMN IF EXISTS "vergiNo";

-- Business tablosuna TC ve Vergi No ekle
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "tcNo" TEXT;
ALTER TABLE "Business" ADD COLUMN IF NOT EXISTS "vergiNo" TEXT;

-- Unique index'leri oluştur (eğer yoksa)
CREATE UNIQUE INDEX IF NOT EXISTS "Business_tcNo_key" ON "Business"("tcNo") WHERE "tcNo" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Business_vergiNo_key" ON "Business"("vergiNo") WHERE "vergiNo" IS NOT NULL;

