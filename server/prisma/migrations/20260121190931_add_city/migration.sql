-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "mac" TEXT,
    "assetTag" TEXT,
    "fhttId" TEXT,
    "supplier" TEXT,
    "invoiceNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Disponível',
    "currentLocation" TEXT NOT NULL DEFAULT 'Estoque Central',
    "city" TEXT NOT NULL DEFAULT 'Nova Maringá',
    "currentHolder" TEXT,
    "clientCode" TEXT,
    "isConsumable" BOOLEAN NOT NULL DEFAULT false,
    "initialAmount" REAL,
    "currentAmount" REAL,
    "unit" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Item" ("assetTag", "brand", "clientCode", "createdAt", "currentAmount", "currentHolder", "currentLocation", "fhttId", "id", "initialAmount", "invoiceNumber", "isConsumable", "mac", "model", "serial", "status", "supplier", "type", "unit", "updatedAt") SELECT "assetTag", "brand", "clientCode", "createdAt", "currentAmount", "currentHolder", "currentLocation", "fhttId", "id", "initialAmount", "invoiceNumber", "isConsumable", "mac", "model", "serial", "status", "supplier", "type", "unit", "updatedAt" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE UNIQUE INDEX "Item_serial_key" ON "Item"("serial");
CREATE UNIQUE INDEX "Item_mac_key" ON "Item"("mac");
CREATE UNIQUE INDEX "Item_assetTag_key" ON "Item"("assetTag");
CREATE UNIQUE INDEX "Item_fhttId_key" ON "Item"("fhttId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
