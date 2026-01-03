-- DropForeignKey
ALTER TABLE "PushToken" DROP CONSTRAINT IF EXISTS "PushToken_userId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "PushToken_userId_key";

-- DropIndex
DROP INDEX IF EXISTS "PushToken_token_key";

-- DropTable
DROP TABLE IF EXISTS "PushToken";

