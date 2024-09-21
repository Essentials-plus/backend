import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../configs/database";
import { env } from "../env";

const ADMIN = env.ADMIN;

async function CreateAdmin() {
  try {
    if (!ADMIN) {
      throw new Error("Admin details not found in env, Please add and restart the server");
    }
    const data = z.object({ name: z.string(), email: z.string().email(), password: z.string() }).parse(JSON.parse(ADMIN));

    const findAdmin = await prisma.admin.findUnique({ where: { email: data.email } });

    if (findAdmin) {
      throw new Error("Admin already exist!, Chill");
    }

    const hashPassword = await bcrypt.hash(data.password, 10);

    await prisma.admin.create({ data: { name: data.name, email: data.email, password: hashPassword } });

    console.log("Admin created successfully");
  } catch (err: any) {
    console.log(err.message);
  }
}

CreateAdmin();
