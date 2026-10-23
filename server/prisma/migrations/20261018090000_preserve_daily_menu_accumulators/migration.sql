PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_DailyMenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyMenuId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "price" DECIMAL NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "remainingQuantity" INTEGER NOT NULL DEFAULT 0,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "DailyMenuItem_dailyMenuId_fkey" FOREIGN KEY ("dailyMenuId") REFERENCES "DailyMenu" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyMenuItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_DailyMenuItem" ("availableQuantity", "dailyMenuId", "id", "menuItemId", "price", "remainingQuantity")
SELECT dmi."availableQuantity", dmi."dailyMenuId", dmi."id", dmi."menuItemId", mi."price", dmi."remainingQuantity"
FROM "DailyMenuItem" dmi
JOIN "MenuItem" mi ON mi."id" = dmi."menuItemId";

DROP TABLE "DailyMenuItem";
ALTER TABLE "new_DailyMenuItem" RENAME TO "DailyMenuItem";
CREATE UNIQUE INDEX "DailyMenuItem_dailyMenuId_menuItemId_key" ON "DailyMenuItem"("dailyMenuId", "menuItemId");

CREATE TABLE "new_OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "subtotal" DECIMAL NOT NULL,
    "menuItemId" TEXT,
    "extraId" TEXT,
    "dailyMenuItemId" TEXT,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_extraId_fkey" FOREIGN KEY ("extraId") REFERENCES "Extra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_dailyMenuItemId_fkey" FOREIGN KEY ("dailyMenuItemId") REFERENCES "DailyMenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_OrderItem" ("description", "extraId", "id", "menuItemId", "orderId", "quantity", "subtotal", "type", "unitPrice", "dailyMenuItemId")
SELECT oi."description", oi."extraId", oi."id", oi."menuItemId", oi."orderId", oi."quantity", oi."subtotal", oi."type", oi."unitPrice",
       CASE WHEN oi."menuItemId" IS NULL THEN NULL ELSE (
         SELECT dmi."id"
         FROM "DailyMenuItem" dmi
         JOIN "DailyMenu" dm ON dm."id" = dmi."dailyMenuId"
         JOIN "Order" o ON o."id" = oi."orderId"
         WHERE dmi."menuItemId" = oi."menuItemId" AND dm."date" = o."orderDate"
         LIMIT 1
       ) END
FROM "OrderItem" oi;

DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
