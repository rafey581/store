-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'COD';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "codFeePaisa" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "announcement" TEXT,
ADD COLUMN     "codFeePaisa" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "codMaxOrderPaisa" INTEGER,
ADD COLUMN     "enableCod" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "heroSubtitle" TEXT,
ADD COLUMN     "heroTitle" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "showInFooter" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");
