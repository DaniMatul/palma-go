PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "OrderAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "name" TEXT,
    "position" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "OrderAccount_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "OrderAccount_orderId_position_idx" ON "OrderAccount"("orderId", "position");

INSERT INTO "OrderAccount" ("id", "orderId", "position")
SELECT lower(hex(randomblob(16))), "id", 1
FROM "Order";

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
    "orderAccountId" TEXT NOT NULL,
    CONSTRAINT "new_OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "new_OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "new_OrderItem_extraId_fkey" FOREIGN KEY ("extraId") REFERENCES "Extra" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "new_OrderItem_dailyMenuItemId_fkey" FOREIGN KEY ("dailyMenuItemId") REFERENCES "DailyMenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "new_OrderItem_orderAccountId_fkey" FOREIGN KEY ("orderAccountId") REFERENCES "OrderAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_OrderItem" ("description", "extraId", "id", "menuItemId", "orderId", "quantity", "subtotal", "type", "unitPrice", "dailyMenuItemId", "orderAccountId")
SELECT oi."description", oi."extraId", oi."id", oi."menuItemId", oi."orderId", oi."quantity", oi."subtotal", oi."type", oi."unitPrice", oi."dailyMenuItemId", oa."id"
FROM "OrderItem" oi
JOIN "OrderAccount" oa ON oa."orderId" = oi."orderId";

DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
