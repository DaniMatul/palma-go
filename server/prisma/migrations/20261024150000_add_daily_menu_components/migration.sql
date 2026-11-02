-- Historical migration already applied to the local database before this
-- repository copy was synchronized. Kept here so Prisma migration history
-- remains reproducible and self-describing.
ALTER TABLE "DailyMenuItem" ADD COLUMN "soldQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "DailyMenuItem" ADD COLUMN "revenue" DECIMAL NOT NULL DEFAULT 0;
