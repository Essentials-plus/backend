import { prisma } from "../configs/database";

const zipCodeData = [
  {
    lockdownDay: 4,
    zipCode: "6545CA",
  },
  {
    lockdownDay: 4,
    zipCode: "1021JT",
  },
  {
    lockdownDay: 4,
    zipCode: "5038EA",
  },
  {
    lockdownDay: 4,
    zipCode: "3030AC",
  },
];

async function CreateZipCode() {
  try {
    await prisma.zipCode.createMany({
      data: zipCodeData,
    });

    console.log("ZipCode created successfully");
  } catch (err: any) {
    console.log(err.message);
  }
}

CreateZipCode();
