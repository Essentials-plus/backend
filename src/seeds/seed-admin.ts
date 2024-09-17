import * as bcrypt from "bcrypt";
import { prisma } from "../configs/database";
import { env } from "../env";

const ADMIN = env.ADMIN;

async function CreateAdmin() {
  try {
    if (!ADMIN) {
      throw new Error("Admin details not found in env, Please add and restart the server");
    }

    const adminData = ADMIN.split("&");

    if (adminData.length !== 3) {
      throw new Error("Admin data not valid");
    }

    const findAdmin = await prisma.admin.findUnique({ where: { email: adminData[1] } });

    if (findAdmin) {
      throw new Error("Admin already exist!, Chill");
    }

    const hashPassword = await bcrypt.hash(adminData[2], 10);

    await prisma.admin.create({ data: { name: adminData[0], email: adminData[1], password: hashPassword } });

    console.log("Admin created successfully");
  } catch (err: any) {
    console.log(err.message);
  }
}

CreateAdmin();
