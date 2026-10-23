PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_DailyMenu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_DailyMenu" ("createdAt", "date", "id", "updatedAt", "status")
SELECT "createdAt", "date", "id", "updatedAt", 'ACTIVE'
FROM "DailyMenu";

DROP TABLE "DailyMenu";
ALTER TABLE "new_DailyMenu" RENAME TO "DailyMenu";

CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyNumber" INTEGER NOT NULL,
    "orderDate" DATETIME NOT NULL,
    "customerName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "promiseTime" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "total" DECIMAL NOT NULL,
    "dailyMenuId" TEXT,
    CONSTRAINT "Order_dailyMenuId_fkey" FOREIGN KEY ("dailyMenuId") REFERENCES "DailyMenu" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Order" ("address", "createdAt", "customerName", "dailyNumber", "id", "orderDate", "promiseTime", "status", "total", "dailyMenuId")
SELECT o."address", o."createdAt", o."customerName", o."dailyNumber", o."id", o."orderDate", o."promiseTime", o."status", o."total",
       (SELECT dm."id" FROM "DailyMenu" dm WHERE dm."date" = o."orderDate" AND dm."status" = 'ACTIVE' LIMIT 1)
FROM "Order" o;

DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderDate_dailyNumber_key" ON "Order"("orderDate", "dailyNumber");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
