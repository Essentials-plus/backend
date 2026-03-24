-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('breakfast', 'dinner', 'lunch', 'snacks1', 'snacks2', 'snacks3');

-- CreateEnum
CREATE TYPE "IngredientUnitType" AS ENUM ('gr', 'ml', 'por', 'pc');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('unpaid', 'processing', 'completed');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('pending', 'active', 'canceled');

-- CreateEnum
CREATE TYPE "PlanOrderStatus" AS ENUM ('confirmed', 'delivered');

-- CreateEnum
CREATE TYPE "TaxPercent" AS ENUM ('9', '21');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('simple', 'variable');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('percent', 'amount');

-- CreateEnum
CREATE TYPE "CouponPolicy" AS ENUM ('onetime', 'multiple');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('ConfirmPayment', 'ConfirmEmail', 'ResetPassword');

-- CreateEnum
CREATE TYPE "UserAccess" AS ENUM ('product', 'all');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'others');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'blocked');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL,
    "meal" "MealType" NOT NULL,
    "mealNumber" TEXT NOT NULL,
    "mealName" TEXT NOT NULL,
    "cookingTime" TEXT NOT NULL,
    "taxPercent" "TaxPercent",
    "shortDescription" TEXT,
    "label" TEXT,
    "subLabel" TEXT,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingredient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" "IngredientUnitType" NOT NULL,
    "kcal" INTEGER NOT NULL,
    "proteins" INTEGER NOT NULL,
    "carbohydrates" INTEGER NOT NULL,
    "fats" INTEGER NOT NULL,
    "fiber" INTEGER NOT NULL,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparationMethod" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreparationMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tips" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyMeal" (
    "id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "shippingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coupon" JSONB,
    "orderId" TEXT,
    "userId" TEXT NOT NULL,
    "shippingAddress" JSONB NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'processing',
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "taxPercent" "TaxPercent",
    "attributes" JSONB,
    "image" TEXT NOT NULL,
    "variationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPlan" (
    "id" TEXT NOT NULL,
    "numberOfDays" INTEGER NOT NULL,
    "mealsPerDay" INTEGER NOT NULL,
    "confirmOrderWeek" INTEGER,
    "status" "PlanStatus" NOT NULL DEFAULT 'pending',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanOrder" (
    "id" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "mealsForTheWeek" JSONB NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "shippingAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planId" TEXT,
    "status" "PlanOrderStatus" NOT NULL DEFAULT 'confirmed',

    CONSTRAINT "PlanOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "longDescription" TEXT,
    "salePrice" INTEGER,
    "regularPrice" INTEGER,
    "images" TEXT[],
    "stock" INTEGER,
    "lowStockThreshold" INTEGER,
    "faqs" JSONB,
    "specs" JSONB,
    "showOnBestSellerSection" BOOLEAN NOT NULL DEFAULT false,
    "showOnCartRecommendationSection" BOOLEAN NOT NULL DEFAULT false,
    "taxPercent" "TaxPercent",
    "linkedToId" TEXT,
    "attributesInfo" JSONB,
    "lowestPrice" INTEGER,
    "highestPrice" INTEGER,
    "type" "ProductType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lowStockNotifiedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReviewOpportunity" (
    "id" TEXT NOT NULL,
    "productId" TEXT,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReviewOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotlightsProductBanners" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotlightsProductBanners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "sortOrder" SERIAL NOT NULL,
    "parentCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariation" (
    "id" TEXT NOT NULL,
    "termIds" TEXT[],
    "salePrice" INTEGER,
    "regularPrice" INTEGER,
    "stock" INTEGER,
    "lowStockThreshold" INTEGER,
    "image" TEXT,
    "imageSameAsVariationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lowStockNotifiedAt" TIMESTAMP(3),
    "productId" TEXT,

    CONSTRAINT "ProductVariation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttributeTerm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productAttributeId" TEXT,
    "productVariationId" TEXT,

    CONSTRAINT "ProductAttributeTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCart" (
    "id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "variationId" TEXT,
    "guestId" TEXT,
    "placed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" INTEGER NOT NULL,
    "policy" "CouponPolicy" NOT NULL,
    "status" "CouponStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Token" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profile" TEXT,
    "surname" TEXT,
    "age" INTEGER,
    "gender" "Gender",
    "weight" INTEGER,
    "height" INTEGER,
    "activityLevel" TEXT,
    "goal" TEXT,
    "address" TEXT,
    "nr" TEXT,
    "city" TEXT,
    "addition" TEXT,
    "email" TEXT NOT NULL,
    "mobile" TEXT,
    "password" TEXT,
    "zipCodeId" TEXT,
    "productDeliveryZipCode" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "access" "UserAccess" NOT NULL DEFAULT 'product',
    "customer" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZipCode" (
    "id" TEXT NOT NULL,
    "lockdownDay" INTEGER NOT NULL,
    "zipCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZipCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNextWeekPlanPrice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNextWeekPlanPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawData" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MealToWeeklyMeal" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_IngredientToMeal" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ProductToProductAttribute" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ProductToProductAttributeTerm" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_ProductToProductCategory" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CouponToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Meal_mealName_idx" ON "Meal"("mealName");

-- CreateIndex
CREATE INDEX "Ingredient_name_idx" ON "Ingredient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientCategory_name_key" ON "IngredientCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "IngredientCategory_slug_key" ON "IngredientCategory"("slug");

-- CreateIndex
CREATE INDEX "IngredientCategory_name_slug_idx" ON "IngredientCategory"("name", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyMeal_week_key" ON "WeeklyMeal"("week");

-- CreateIndex
CREATE INDEX "WeeklyMeal_week_idx" ON "WeeklyMeal"("week");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderId_key" ON "Order"("orderId");

-- CreateIndex
CREATE INDEX "Order_amount_idx" ON "Order"("amount");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_productId_name_variationId_idx" ON "OrderItem"("orderId", "productId", "name", "variationId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPlan_userId_key" ON "UserPlan"("userId");

-- CreateIndex
CREATE INDEX "UserPlan_numberOfDays_mealsPerDay_userId_idx" ON "UserPlan"("numberOfDays", "mealsPerDay", "userId");

-- CreateIndex
CREATE INDEX "PlanOrder_totalAmount_week_idx" ON "PlanOrder"("totalAmount", "week");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_slug_name_description_salePrice_regularPrice_stock__idx" ON "Product"("slug", "name", "description", "salePrice", "regularPrice", "stock", "showOnBestSellerSection", "showOnCartRecommendationSection");

-- CreateIndex
CREATE INDEX "ProductReview_userId_rating_productId_orderId_idx" ON "ProductReview"("userId", "rating", "productId", "orderId");

-- CreateIndex
CREATE INDEX "ProductReviewOpportunity_userId_productId_orderId_idx" ON "ProductReviewOpportunity"("userId", "productId", "orderId");

-- CreateIndex
CREATE UNIQUE INDEX "SpotlightsProductBanners_productId_key" ON "SpotlightsProductBanners"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_slug_key" ON "ProductCategory"("slug");

-- CreateIndex
CREATE INDEX "ProductCategory_name_slug_idx" ON "ProductCategory"("name", "slug");

-- CreateIndex
CREATE INDEX "ProductVariation_productId_salePrice_regularPrice_stock_idx" ON "ProductVariation"("productId", "salePrice", "regularPrice", "stock");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_name_key" ON "ProductAttribute"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_slug_key" ON "ProductAttribute"("slug");

-- CreateIndex
CREATE INDEX "ProductAttribute_name_slug_idx" ON "ProductAttribute"("name", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeTerm_name_key" ON "ProductAttributeTerm"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeTerm_slug_key" ON "ProductAttributeTerm"("slug");

-- CreateIndex
CREATE INDEX "ProductAttributeTerm_name_slug_idx" ON "ProductAttributeTerm"("name", "slug");

-- CreateIndex
CREATE INDEX "ProductCart_userId_productId_guestId_idx" ON "ProductCart"("userId", "productId", "guestId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_code_policy_status_idx" ON "Coupon"("code", "policy", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Token_token_key" ON "Token"("token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_mobile_name_surname_zipCodeId_password_idx" ON "User"("email", "mobile", "name", "surname", "zipCodeId", "password");

-- CreateIndex
CREATE UNIQUE INDEX "ZipCode_zipCode_key" ON "ZipCode"("zipCode");

-- CreateIndex
CREATE INDEX "ZipCode_zipCode_lockdownDay_idx" ON "ZipCode"("zipCode", "lockdownDay");

-- CreateIndex
CREATE UNIQUE INDEX "UserNextWeekPlanPrice_userId_key" ON "UserNextWeekPlanPrice"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RawData_identifier_key" ON "RawData"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "_MealToWeeklyMeal_AB_unique" ON "_MealToWeeklyMeal"("A", "B");

-- CreateIndex
CREATE INDEX "_MealToWeeklyMeal_B_index" ON "_MealToWeeklyMeal"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_IngredientToMeal_AB_unique" ON "_IngredientToMeal"("A", "B");

-- CreateIndex
CREATE INDEX "_IngredientToMeal_B_index" ON "_IngredientToMeal"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductToProductAttribute_AB_unique" ON "_ProductToProductAttribute"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductToProductAttribute_B_index" ON "_ProductToProductAttribute"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductToProductAttributeTerm_AB_unique" ON "_ProductToProductAttributeTerm"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductToProductAttributeTerm_B_index" ON "_ProductToProductAttributeTerm"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_ProductToProductCategory_AB_unique" ON "_ProductToProductCategory"("A", "B");

-- CreateIndex
CREATE INDEX "_ProductToProductCategory_B_index" ON "_ProductToProductCategory"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CouponToUser_AB_unique" ON "_CouponToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_CouponToUser_B_index" ON "_CouponToUser"("B");

-- AddForeignKey
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "IngredientCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparationMethod" ADD CONSTRAINT "PreparationMethod_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tips" ADD CONSTRAINT "Tips_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlan" ADD CONSTRAINT "UserPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanOrder" ADD CONSTRAINT "PlanOrder_planId_fkey" FOREIGN KEY ("planId") REFERENCES "UserPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_linkedToId_fkey" FOREIGN KEY ("linkedToId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviewOpportunity" ADD CONSTRAINT "ProductReviewOpportunity_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviewOpportunity" ADD CONSTRAINT "ProductReviewOpportunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviewOpportunity" ADD CONSTRAINT "ProductReviewOpportunity_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotlightsProductBanners" ADD CONSTRAINT "SpotlightsProductBanners_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariation" ADD CONSTRAINT "ProductVariation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeTerm" ADD CONSTRAINT "ProductAttributeTerm_productAttributeId_fkey" FOREIGN KEY ("productAttributeId") REFERENCES "ProductAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeTerm" ADD CONSTRAINT "ProductAttributeTerm_productVariationId_fkey" FOREIGN KEY ("productVariationId") REFERENCES "ProductVariation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCart" ADD CONSTRAINT "ProductCart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCart" ADD CONSTRAINT "ProductCart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCart" ADD CONSTRAINT "ProductCart_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "ProductVariation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_zipCodeId_fkey" FOREIGN KEY ("zipCodeId") REFERENCES "ZipCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNextWeekPlanPrice" ADD CONSTRAINT "UserNextWeekPlanPrice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MealToWeeklyMeal" ADD CONSTRAINT "_MealToWeeklyMeal_A_fkey" FOREIGN KEY ("A") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MealToWeeklyMeal" ADD CONSTRAINT "_MealToWeeklyMeal_B_fkey" FOREIGN KEY ("B") REFERENCES "WeeklyMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IngredientToMeal" ADD CONSTRAINT "_IngredientToMeal_A_fkey" FOREIGN KEY ("A") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IngredientToMeal" ADD CONSTRAINT "_IngredientToMeal_B_fkey" FOREIGN KEY ("B") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToProductAttribute" ADD CONSTRAINT "_ProductToProductAttribute_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToProductAttribute" ADD CONSTRAINT "_ProductToProductAttribute_B_fkey" FOREIGN KEY ("B") REFERENCES "ProductAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToProductAttributeTerm" ADD CONSTRAINT "_ProductToProductAttributeTerm_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToProductAttributeTerm" ADD CONSTRAINT "_ProductToProductAttributeTerm_B_fkey" FOREIGN KEY ("B") REFERENCES "ProductAttributeTerm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToProductCategory" ADD CONSTRAINT "_ProductToProductCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToProductCategory" ADD CONSTRAINT "_ProductToProductCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "ProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CouponToUser" ADD CONSTRAINT "_CouponToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CouponToUser" ADD CONSTRAINT "_CouponToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

