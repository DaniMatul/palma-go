-- Keep exactly one active daily menu for existing data.
UPDATE "DailyMenu"
SET "status" = 'CLOSED'
WHERE "id" NOT IN (
    SELECT "id"
    FROM "DailyMenu"
    WHERE "status" = 'ACTIVE'
    ORDER BY "date" DESC, "createdAt" DESC
    LIMIT 1
);
