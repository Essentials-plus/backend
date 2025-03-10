import { PrismaClient } from "@prisma/client";
import { pagination } from "prisma-extension-pagination";

export const prisma = new PrismaClient()
  .$extends({
    query: {
      product: {
        async update({ args, query }) {
          if (args.data.type === "simple") {
            const mainPrice = args.data.salePrice || args.data.regularPrice || null;
            args.data.lowestPrice = args.data.lowestPrice || mainPrice;
            args.data.highestPrice = args.data.highestPrice || mainPrice;
          }

          return query(args);
        },
      },
    },
  })
  .$extends(
    pagination({
      pages: {
        limit: 5, // set default limit to 20
        includePageCount: true, // include counters by default
      },
    }),
  );
