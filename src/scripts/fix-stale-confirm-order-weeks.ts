/**
 * Emergency fix script for confirmOrderWeek year boundary issue
 *
 * This script fixes users stuck on week 52 from 2025 by updating their
 * confirmOrderWeek to the current week number.
 *
 * Run this script once to immediately fix all affected users:
 * npx ts-node src/scripts/fix-stale-confirm-order-weeks.ts
 */

import "dotenv/config";
import "../configs/database";
import { prisma } from "../configs/database";
import Utils from "../utils";

async function fixStaleConfirmOrderWeeks() {
  console.log("🔧 Starting fix for stale confirmOrderWeek values...\n");

  try {
    const currentWeek = Utils.getCurrentWeekNumber();
    console.log(`Current week number: ${currentWeek}`);

    // Get all user plans
    const allPlans = await prisma.userPlan.findMany({
      select: {
        id: true,
        confirmOrderWeek: true,
        userId: true,
        status: true,
      },
    });

    console.log(`Total user plans found: ${allPlans.length}\n`);

    // Filter plans that need updating
    /**
     * Filters for plans that still have a confirm-order week defined and either the week has already passed
     * or the Utility reports it as stale; `isStaleConfirmOrderWeek` compares the plan’s confirm week to the current
     * week using the utility’s staleness rules to determine whether a plan’s confirmation window is no longer valid.
     */
    const stalePlans = allPlans.filter((plan) => {
      if (!plan.confirmOrderWeek) return false;

      const isStale = Utils.isStaleConfirmOrderWeek(plan.confirmOrderWeek, currentWeek);
      const isOutdated = plan.confirmOrderWeek < currentWeek;

      return isStale || isOutdated;
    });

    console.log(`Plans needing update: ${stalePlans.length}`);

    if (stalePlans.length === 0) {
      console.log("✅ No stale plans found. All plans are up to date!");
      return;
    }

    // Show details of plans to be updated
    console.log("\nPlans to be updated:");
    stalePlans.forEach((plan, index) => {
      console.log(
        `  ${index + 1}. User ID: ${plan.userId.substring(0, 8)}... | ` +
          `Status: ${plan.status} | ` +
          `Old week: ${plan.confirmOrderWeek} → New week: ${currentWeek}`,
      );
    });

    console.log("\n🚀 Updating plans...");

    // Update all stale plans
    const result = await prisma.userPlan.updateMany({
      where: {
        id: {
          in: stalePlans.map((p) => p.id),
        },
      },
      data: {
        confirmOrderWeek: currentWeek,
      },
    });

    console.log(`\n✅ Successfully updated ${result.count} user plans!`);
    console.log(`All affected users can now place orders for week ${currentWeek}.`);
  } catch (error: any) {
    console.error("\n❌ Error fixing stale confirmOrderWeek values:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixStaleConfirmOrderWeeks()
  .then(() => {
    console.log("\n✨ Fix completed successfully!");
    process.exit(0);
  })
  .catch((error: any) => {
    console.error("\n❌ Fix failed:", error);
    process.exit(1);
  });
