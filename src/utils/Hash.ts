import * as bcrypt from "bcrypt";
import { createHash, randomBytes } from "crypto";
import * as CryptoJS from "crypto-js";
import { env } from "../env";

const HASH_SALT = env.HASH_SECRET;

class Hash {
  static encryptData = (data: any) => {
    return CryptoJS.AES.encrypt(JSON.stringify(data), HASH_SALT).toString();
  };

  static decryptData = (hash?: string) => {
    const json = CryptoJS.AES.decrypt(hash || "", HASH_SALT).toString(CryptoJS.enc.Utf8);
    try {
      const data = JSON.parse(json);
      return data;
    } catch (error) {
      return undefined;
    }
  };

  static randomString = (length = 32) => {
    const randomData = randomBytes(length);
    const timestamp = Date.now().toString();
    const combinedData = randomData.toString("hex") + timestamp;
    const hash = createHash("sha256");
    hash.update(combinedData);
    return hash.digest("hex");
  };

  static async _hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
  }
  static async _matchPassword(password: string, hash: string) {
    return await bcrypt.compare(password, hash);
  }
}

export default Hash;
