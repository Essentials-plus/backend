import { prisma } from "../configs/database";

const products = [
  {
    name: "E+ Whey poweder",
    slug: "e+-whey-powder-38583472923",
    description:
      "Whey eiwitpoeder is een bekend middel onder intensieve sporters, zoals bodybuilders en fanatieke krachtsporters. Het helpt bij het opbouwen van spiermassa en bij het herstel van spieren. Het kan helpen bij afvallen door honger gevoel te verminderen en stofwisseling te verhogen.  Whey eiwitpoeder helpt met het eenvoudig behalen of supplementeren van je eiwitdoelen. Klik hiernaast om de E+ Whey in je winkelwagen toe te voegen.",
    salePrice: 990,
    regularPrice: 1100,
    images: ["https://assets.bonappetit.com/photos/6606cdfe2b76b9fa72667d64/16:9/w_2560%2Cc_limit/BA_3.28_Best-Whey-Protein-Powder.jpg"],
    stock: 89,
    type: "simple" as "simple" | "variable",
    lowStockThreshold: 10,
  },
];

const seed = async () => {
  try {
    for await (const product of products) {
      await prisma.product.create({
        data: {
          ...product,
          taxPercent: "TAX9",
        },
      });
    }

    console.log("Product created successfully");
  } catch (error) {
    console.log(error);
  }
};

seed();
