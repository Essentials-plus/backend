import { PrismaClient } from "@prisma/client";
import { pagination } from "prisma-extension-pagination";

export const prisma = new PrismaClient().$extends(
  pagination({
    pages: {
      limit: 20, // set default limit to 20
      includePageCount: true, // include counters by default
    },
  }),
);
