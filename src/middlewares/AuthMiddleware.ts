import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../configs/database";
import { env } from "../env";
import HttpError from "../utils/HttpError";

class AuthMiddleware {
  private JWT_SECRET = env.JWT_SECRET || "";

  validateAdmin: RequestHandler = async (req, res, next) => {
    try {
      const auth = req.headers["authorization"];
      if (!auth) throw new HttpError("Authorization failed, Please login", 401);
      const hash: any = jwt.verify(auth, this.JWT_SECRET);

      if (!hash) throw new HttpError("Authorization failed, Please login", 401);

      const admin = await prisma.admin.findUnique({
        where: {
          id: hash.id,
        },
      });

      if (!admin) {
        throw new HttpError("Authorization failed, Please login", 401);
      }

      next();
    } catch (error) {
      throw new HttpError("Authorization failed, Please login", 401);
    }
  };

  validateUser: RequestHandler = async (req, res, next) => {
    const auth = req.headers["authorization"];
    if (!auth) throw new HttpError("Authorization failed, Please login", 401);

    const hash: any = jwt.verify(auth, this.JWT_SECRET);

    if (!hash) throw new HttpError("Authorization failed, Please login", 401);

    //check user
    const user = await prisma.user.findUnique({ where: { id: hash.id } });
    if (!user) throw new HttpError("User doesn't exist!", 404);
    if (user.status === "blocked") throw new HttpError("User is blocked by authority", 403);

    req.user = { id: hash?.id };
    next();
  };
}

export default AuthMiddleware;
