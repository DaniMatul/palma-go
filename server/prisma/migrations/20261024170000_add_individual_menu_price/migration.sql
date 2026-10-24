-- Additive migration: existing daily menu items keep a null individual price
-- until it is configured, and existing order items remain FULL by default.
ALTER TABLE "DailyMenuItem" ADD COLUMN "individualPrice" DECIMAL;
ALTER TABLE "OrderItem" ADD COLUMN "menuMode" TEXT NOT NULL DEFAULT 'FULL';
ALTER TABLE "OrderItem" ADD COLUMN "menuComponentsSnapshot" TEXT;
