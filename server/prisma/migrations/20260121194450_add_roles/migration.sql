-- CreateTable
CREATE TABLE "Role" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'blue'
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_value_key" ON "Role"("value");
