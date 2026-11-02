PRAGMA foreign_keys=OFF;

CREATE TABLE "OrderInventoryAllocation_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "orderItemOptionId" TEXT NOT NULL,
    "dailyMenuOptionId" TEXT,
    "dailyMenuItemId" TEXT,
    "quantity" INTEGER NOT NULL,
    "reservedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" DATETIME,
    "releaseReason" TEXT,
    CONSTRAINT "OrderInventoryAllocation_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "OrderInventoryAllocation_target_required" CHECK ("dailyMenuOptionId" IS NOT NULL OR "dailyMenuItemId" IS NOT NULL),
    CONSTRAINT "OrderInventoryAllocation_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderInventoryAllocation_orderItemOptionId_fkey"
      FOREIGN KEY ("orderItemOptionId") REFERENCES "OrderItemOption" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderInventoryAllocation_dailyMenuOptionId_fkey"
      FOREIGN KEY ("dailyMenuOptionId") REFERENCES "DailyMenuOption" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderInventoryAllocation_dailyMenuItemId_fkey"
      FOREIGN KEY ("dailyMenuItemId") REFERENCES "DailyMenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "OrderInventoryAllocation_new" (
    "id", "orderId", "orderItemOptionId", "dailyMenuOptionId", "quantity", "reservedAt", "releasedAt", "releaseReason"
)
SELECT
    "id", "orderId", "orderItemOptionId", "dailyMenuOptionId", "quantity", "reservedAt", "releasedAt", "releaseReason"
FROM "OrderInventoryAllocation";

DROP TABLE "OrderInventoryAllocation";
ALTER TABLE "OrderInventoryAllocation_new" RENAME TO "OrderInventoryAllocation";

CREATE INDEX "OrderInventoryAllocation_orderId_idx"
ON "OrderInventoryAllocation"("orderId");

CREATE INDEX "OrderInventoryAllocation_dailyMenuOptionId_releasedAt_idx"
ON "OrderInventoryAllocation"("dailyMenuOptionId", "releasedAt");

CREATE INDEX "OrderInventoryAllocation_dailyMenuItemId_releasedAt_idx"
ON "OrderInventoryAllocation"("dailyMenuItemId", "releasedAt");

PRAGMA foreign_keys=ON;
