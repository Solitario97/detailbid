-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'user';

-- CreateIndex
CREATE INDEX "Request_source_createdAt_idx" ON "Request"("source", "createdAt");

-- CreateTable
CREATE TABLE "BotJobExecution" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotJobExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BotJobExecution_key_key" ON "BotJobExecution"("key");
