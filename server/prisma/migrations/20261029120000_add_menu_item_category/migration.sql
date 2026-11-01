ALTER TABLE "MenuItem" ADD COLUMN "category" TEXT;

UPDATE "MenuItem"
SET "category" = 'LUNCH'
WHERE lower("name") IN ('pepián', 'pepian', 'pollo dorado', 'caldo de res', 'hilachas', 'chuleta');
