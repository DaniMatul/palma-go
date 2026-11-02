PRAGMA foreign_keys=OFF;

CREATE TABLE "MenuOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL NOT NULL,
    "kind" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "legacyExtraId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuOption_price_non_negative" CHECK ("price" >= 0),
    CONSTRAINT "MenuOption_legacyExtraId_fkey"
      FOREIGN KEY ("legacyExtraId") REFERENCES "Extra" ("id")
      ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MenuOption_legacyExtraId_key"
ON "MenuOption"("legacyExtraId");

CREATE INDEX "MenuOption_kind_active_idx"
ON "MenuOption"("kind", "active");

CREATE TABLE "MenuOptionCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MenuOptionCategory_optionId_fkey"
      FOREIGN KEY ("optionId") REFERENCES "MenuOption" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MenuOptionCategory_optionId_category_key"
ON "MenuOptionCategory"("optionId", "category");

CREATE TABLE "MenuItemOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuItemId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "MenuItemOption_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "MenuItemOption_menuItemId_fkey"
      FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MenuItemOption_optionId_fkey"
      FOREIGN KEY ("optionId") REFERENCES "MenuOption" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "MenuItemOption_menuItemId_optionId_role_key"
ON "MenuItemOption"("menuItemId", "optionId", "role");

CREATE TABLE "DailyMenuOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyMenuId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "initialQuantity" INTEGER,
    "remainingQuantity" INTEGER,
    "soldQuantity" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DailyMenuOption_price_non_negative" CHECK ("price" >= 0),
    CONSTRAINT "DailyMenuOption_initialQuantity_non_negative"
      CHECK ("initialQuantity" IS NULL OR "initialQuantity" >= 0),
    CONSTRAINT "DailyMenuOption_remainingQuantity_non_negative"
      CHECK ("remainingQuantity" IS NULL OR "remainingQuantity" >= 0),
    CONSTRAINT "DailyMenuOption_soldQuantity_non_negative"
      CHECK ("soldQuantity" >= 0),
    CONSTRAINT "DailyMenuOption_dailyMenuId_fkey"
      FOREIGN KEY ("dailyMenuId") REFERENCES "DailyMenu" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyMenuOption_optionId_fkey"
      FOREIGN KEY ("optionId") REFERENCES "MenuOption" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DailyMenuOption_dailyMenuId_category_optionId_key"
ON "DailyMenuOption"("dailyMenuId", "category", "optionId");

CREATE TABLE "DailyMenuItemOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyMenuItemId" TEXT NOT NULL,
    "dailyMenuOptionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "included" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DailyMenuItemOption_dailyMenuItemId_fkey"
      FOREIGN KEY ("dailyMenuItemId") REFERENCES "DailyMenuItem" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyMenuItemOption_dailyMenuOptionId_fkey"
      FOREIGN KEY ("dailyMenuOptionId") REFERENCES "DailyMenuOption" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DailyMenuItemOption_dailyMenuItemId_dailyMenuOptionId_role_key"
ON "DailyMenuItemOption"("dailyMenuItemId", "dailyMenuOptionId", "role");

CREATE TABLE "OrderItemOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderItemId" TEXT NOT NULL,
    "dailyMenuOptionId" TEXT,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "charge" DECIMAL NOT NULL,
    "replacedDescription" TEXT,
    "replacedUnitPrice" DECIMAL,
    CONSTRAINT "OrderItemOption_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "OrderItemOption_unitPrice_non_negative" CHECK ("unitPrice" >= 0),
    CONSTRAINT "OrderItemOption_charge_non_negative" CHECK ("charge" >= 0),
    CONSTRAINT "OrderItemOption_orderItemId_fkey"
      FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItemOption_dailyMenuOptionId_fkey"
      FOREIGN KEY ("dailyMenuOptionId") REFERENCES "DailyMenuOption" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "OrderItemOption_orderItemId_idx"
ON "OrderItemOption"("orderItemId");

CREATE TABLE "OrderInventoryAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "orderItemOptionId" TEXT NOT NULL,
    "dailyMenuOptionId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reservedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" DATETIME,
    "releaseReason" TEXT,
    CONSTRAINT "OrderInventoryAllocation_quantity_positive" CHECK ("quantity" > 0),
    CONSTRAINT "OrderInventoryAllocation_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderInventoryAllocation_orderItemOptionId_fkey"
      FOREIGN KEY ("orderItemOptionId") REFERENCES "OrderItemOption" ("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderInventoryAllocation_dailyMenuOptionId_fkey"
      FOREIGN KEY ("dailyMenuOptionId") REFERENCES "DailyMenuOption" ("id")
      ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "OrderInventoryAllocation_orderId_idx"
ON "OrderInventoryAllocation"("orderId");

CREATE INDEX "OrderInventoryAllocation_dailyMenuOptionId_releasedAt_idx"
ON "OrderInventoryAllocation"("dailyMenuOptionId", "releasedAt");

ALTER TABLE "DailyMenuItem" ADD COLUMN "inventoryMode" TEXT NOT NULL DEFAULT 'LEGACY';
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Order" ADD COLUMN "idempotencyFingerprint" TEXT;

CREATE UNIQUE INDEX "Order_idempotencyKey_key"
ON "Order"("idempotencyKey");

PRAGMA foreign_keys=ON;
