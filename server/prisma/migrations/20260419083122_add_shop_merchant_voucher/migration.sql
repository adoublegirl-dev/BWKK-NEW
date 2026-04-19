/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `shop_products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "orders" ADD COLUMN "lastViewedAt" DATETIME;

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "admin_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admin_users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'login',
    "used" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "product_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "product_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "voucher_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "merchantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "faceValue" INTEGER NOT NULL,
    "pointsPerVoucher" INTEGER NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "distributedQty" INTEGER NOT NULL DEFAULT 0,
    "remainingQty" INTEGER NOT NULL,
    "validDays" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "postId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "voucher_batches_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "voucher_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "userId" TEXT,
    "redeemCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unused',
    "faceValue" INTEGER NOT NULL,
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "sourceType" TEXT NOT NULL DEFAULT 'merchant_post',
    "redeemedAt" DATETIME,
    "redeemedByMerchantId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "voucher_codes_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "voucher_batches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "voucher_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "exchange_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "productId" TEXT,
    "productName" TEXT,
    "productImage" TEXT,
    "voucherCodeId" TEXT,
    "redeemCode" TEXT,
    "faceValue" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "redeemedAt" DATETIME,
    "redeemedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "exchange_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "exchange_records_productId_fkey" FOREIGN KEY ("productId") REFERENCES "shop_products" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "exchange_records_voucherCodeId_fkey" FOREIGN KEY ("voucherCodeId") REFERENCES "voucher_codes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "points_adjustment_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetType" TEXT NOT NULL DEFAULT 'single',
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "beforeBalance" INTEGER,
    "afterBalance" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "points_adjustment_logs_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '帮我看看',
    "description" TEXT NOT NULL,
    "locationName" TEXT,
    "address" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "rewardAmount" INTEGER NOT NULL DEFAULT 0,
    "compensateRate" INTEGER NOT NULL DEFAULT 0,
    "deadline" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "lastViewedSubmissionsAt" DATETIME,
    "postType" TEXT NOT NULL DEFAULT 'normal',
    "selectionMode" TEXT,
    "selectionCount" INTEGER NOT NULL DEFAULT 1,
    "rewardType" TEXT NOT NULL DEFAULT 'points',
    "voucherBatchId" TEXT,
    "autoSelectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "posts_voucherBatchId_fkey" FOREIGN KEY ("voucherBatchId") REFERENCES "voucher_batches" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_posts" ("address", "compensateRate", "createdAt", "deadline", "description", "id", "latitude", "locationName", "longitude", "orderCount", "rewardAmount", "status", "title", "updatedAt", "userId") SELECT "address", "compensateRate", "createdAt", "deadline", "description", "id", "latitude", "locationName", "longitude", "orderCount", "rewardAmount", "status", "title", "updatedAt", "userId" FROM "posts";
DROP TABLE "posts";
ALTER TABLE "new_posts" RENAME TO "posts";
CREATE UNIQUE INDEX "posts_voucherBatchId_key" ON "posts"("voucherBatchId");
CREATE INDEX "posts_userId_idx" ON "posts"("userId");
CREATE INDEX "posts_status_idx" ON "posts"("status");
CREATE INDEX "posts_createdAt_idx" ON "posts"("createdAt");
CREATE INDEX "posts_postType_idx" ON "posts"("postType");
CREATE TABLE "new_shop_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT,
    "categoryId" TEXT,
    "pointsPrice" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "exchangedCount" INTEGER NOT NULL DEFAULT 0,
    "remainingCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "validFrom" DATETIME,
    "validUntil" DATETIME,
    "province" TEXT,
    "city" TEXT,
    "district" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "shop_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_shop_products" ("createdAt", "description", "id", "name", "pointsPrice", "status", "stock", "updatedAt") SELECT "createdAt", "description", "id", "name", "pointsPrice", "status", "stock", "updatedAt" FROM "shop_products";
DROP TABLE "shop_products";
ALTER TABLE "new_shop_products" RENAME TO "shop_products";
CREATE INDEX "shop_products_categoryId_idx" ON "shop_products"("categoryId");
CREATE INDEX "shop_products_status_idx" ON "shop_products"("status");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openid" TEXT,
    "unionid" TEXT,
    "nickname" TEXT,
    "avatarUrl" TEXT,
    "city" TEXT,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "posterCredit" INTEGER NOT NULL DEFAULT 100,
    "doerCredit" INTEGER NOT NULL DEFAULT 100,
    "creditStatus" TEXT NOT NULL DEFAULT 'normal',
    "frozenUntil" DATETIME,
    "totalPoints" INTEGER NOT NULL DEFAULT 100,
    "frozenPoints" INTEGER NOT NULL DEFAULT 0,
    "role" TEXT NOT NULL DEFAULT 'normal',
    "merchantName" TEXT,
    "merchantDesc" TEXT,
    "merchantContact" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("avatarUrl", "city", "createdAt", "creditStatus", "doerCredit", "frozenPoints", "frozenUntil", "id", "nickname", "openid", "posterCredit", "totalPoints", "updatedAt") SELECT "avatarUrl", "city", "createdAt", "creditStatus", "doerCredit", "frozenPoints", "frozenUntil", "id", "nickname", "openid", "posterCredit", "totalPoints", "updatedAt" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_openid_key" ON "users"("openid");
CREATE UNIQUE INDEX "users_unionid_key" ON "users"("unionid");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_city_idx" ON "users"("city");
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_role_idx" ON "users"("role");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_username_key" ON "admin_users"("username");

-- CreateIndex
CREATE INDEX "admin_logs_adminId_idx" ON "admin_logs"("adminId");

-- CreateIndex
CREATE INDEX "admin_logs_action_idx" ON "admin_logs"("action");

-- CreateIndex
CREATE INDEX "admin_logs_targetType_targetId_idx" ON "admin_logs"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "admin_logs_createdAt_idx" ON "admin_logs"("createdAt");

-- CreateIndex
CREATE INDEX "verification_codes_email_code_idx" ON "verification_codes"("email", "code");

-- CreateIndex
CREATE INDEX "verification_codes_expiresAt_idx" ON "verification_codes"("expiresAt");

-- CreateIndex
CREATE INDEX "product_categories_parentId_idx" ON "product_categories"("parentId");

-- CreateIndex
CREATE INDEX "product_categories_level_idx" ON "product_categories"("level");

-- CreateIndex
CREATE INDEX "product_categories_status_idx" ON "product_categories"("status");

-- CreateIndex
CREATE INDEX "voucher_batches_merchantId_idx" ON "voucher_batches"("merchantId");

-- CreateIndex
CREATE INDEX "voucher_batches_status_idx" ON "voucher_batches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_codes_redeemCode_key" ON "voucher_codes"("redeemCode");

-- CreateIndex
CREATE INDEX "voucher_codes_batchId_idx" ON "voucher_codes"("batchId");

-- CreateIndex
CREATE INDEX "voucher_codes_userId_idx" ON "voucher_codes"("userId");

-- CreateIndex
CREATE INDEX "voucher_codes_status_idx" ON "voucher_codes"("status");

-- CreateIndex
CREATE INDEX "voucher_codes_redeemedByMerchantId_idx" ON "voucher_codes"("redeemedByMerchantId");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_records_voucherCodeId_key" ON "exchange_records"("voucherCodeId");

-- CreateIndex
CREATE INDEX "exchange_records_userId_idx" ON "exchange_records"("userId");

-- CreateIndex
CREATE INDEX "exchange_records_type_idx" ON "exchange_records"("type");

-- CreateIndex
CREATE INDEX "exchange_records_status_idx" ON "exchange_records"("status");

-- CreateIndex
CREATE INDEX "exchange_records_createdAt_idx" ON "exchange_records"("createdAt");

-- CreateIndex
CREATE INDEX "points_adjustment_logs_adminId_idx" ON "points_adjustment_logs"("adminId");

-- CreateIndex
CREATE INDEX "points_adjustment_logs_targetUserId_idx" ON "points_adjustment_logs"("targetUserId");

-- CreateIndex
CREATE INDEX "points_adjustment_logs_createdAt_idx" ON "points_adjustment_logs"("createdAt");
