-- CreateTable
CREATE TABLE "Technician" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_History" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "origin" TEXT,
    "destination" TEXT,
    "notes" TEXT,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" INTEGER NOT NULL,
    "technicianId" INTEGER,
    CONSTRAINT "History_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "History_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_History" ("action", "date", "description", "destination", "id", "itemId", "location", "notes", "origin") SELECT "action", "date", "description", "destination", "id", "itemId", "location", "notes", "origin" FROM "History";
DROP TABLE "History";
ALTER TABLE "new_History" RENAME TO "History";
CREATE TABLE "new_Item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "mac" TEXT,
    "assetTag" TEXT,
    "supplier" TEXT,
    "invoiceNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Disponível',
    "currentLocation" TEXT NOT NULL DEFAULT 'Estoque Central',
    "currentHolder" TEXT,
    "isConsumable" BOOLEAN NOT NULL DEFAULT false,
    "initialAmount" REAL,
    "currentAmount" REAL,
    "unit" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Item" ("assetTag", "brand", "createdAt", "currentHolder", "currentLocation", "id", "invoiceNumber", "mac", "model", "serial", "status", "supplier", "type", "updatedAt") SELECT "assetTag", "brand", "createdAt", "currentHolder", "currentLocation", "id", "invoiceNumber", "mac", "model", "serial", "status", "supplier", "type", "updatedAt" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE UNIQUE INDEX "Item_serial_key" ON "Item"("serial");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
