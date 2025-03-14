-- CreateTable
CREATE TABLE "DetailedListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "borough" TEXT,
    "neighborhood" TEXT,
    "propertyType" TEXT,
    "sqft" INTEGER,
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" INTEGER NOT NULL,
    "amenities" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT NOT NULL,
    "imageAnalysis" TEXT,
    "noFee" BOOLEAN NOT NULL DEFAULT false,
    "agents" TEXT NOT NULL,
    "availableFrom" TEXT,
    "daysOnMarket" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
