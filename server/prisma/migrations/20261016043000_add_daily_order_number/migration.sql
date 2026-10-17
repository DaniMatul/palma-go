-- Add the business date and visible daily number without replacing the technical id.
ALTER TABLE "Order" ADD COLUMN "dailyNumber" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "orderDate" DATETIME NOT NULL DEFAULT '1970-01-01 12:00:00';

-- Guatemala business dates are UTC-6. Existing orders are numbered by createdAt
-- ascending within that business date.
UPDATE "Order"
SET "orderDate" = CAST(strftime('%s', date("createdAt" / 1000, 'unixepoch', '-6 hours') || ' 12:00:00') AS INTEGER) * 1000;

UPDATE "Order" AS currentOrder
SET "dailyNumber" = (
  SELECT COUNT(*)
  FROM "Order" AS previousOrder
  WHERE date(previousOrder."createdAt" / 1000, 'unixepoch', '-6 hours') = date(currentOrder."createdAt" / 1000, 'unixepoch', '-6 hours')
    AND (
      previousOrder."createdAt" < currentOrder."createdAt"
      OR (previousOrder."createdAt" = currentOrder."createdAt" AND previousOrder."id" <= currentOrder."id")
    )
);

CREATE UNIQUE INDEX "Order_orderDate_dailyNumber_key" ON "Order"("orderDate", "dailyNumber");
