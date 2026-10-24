-- CreateTable
CREATE TABLE "ComponentCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "defaultExtraPortionPrice" DECIMAL NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DailyMenuComponent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyMenuItemId" TEXT NOT NULL,
    "catalogComponentId" TEXT,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "removable" BOOLEAN NOT NULL DEFAULT true,
    "allowsExtraPortion" BOOLEAN NOT NULL DEFAULT false,
    "extraPortionPrice" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "DailyMenuComponent_dailyMenuItemId_fkey" FOREIGN KEY ("dailyMenuItemId") REFERENCES "DailyMenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyMenuComponent_catalogComponentId_fkey" FOREIGN KEY ("catalogComponentId") REFERENCES "ComponentCatalog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItemCustomization" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderItemId" TEXT NOT NULL,
    "dailyMenuComponentId" TEXT,
    "componentName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL NOT NULL DEFAULT 0,
    CONSTRAINT "OrderItemCustomization_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItemCustomization_dailyMenuComponentId_fkey" FOREIGN KEY ("dailyMenuComponentId") REFERENCES "DailyMenuComponent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "comment" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ComponentCatalog_nameNormalized_key" ON "ComponentCatalog"("nameNormalized");

-- CreateIndex
CREATE INDEX "DailyMenuComponent_dailyMenuItemId_position_idx" ON "DailyMenuComponent"("dailyMenuItemId", "position");

-- CreateIndex
CREATE INDEX "OrderItemCustomization_orderItemId_idx" ON "OrderItemCustomization"("orderItemId");
