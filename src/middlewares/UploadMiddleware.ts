import { S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { env } from "../env";

class UploadMiddleware {
  private AWS_BUCKET = env.AWS_BUCKET || "";
  private AWS_REGION = env.AWS_REGION || "";
  private AWS_ACCESS_KEY = env.AWS_ACCESS_KEY || "";
  private AWS_SECRET_KEY = env.AWS_SECRET_KEY || "";
  private client: S3Client;

  public upload: multer.Multer;

  constructor() {
    this.client = new S3Client({
      region: this.AWS_REGION,
      credentials: {
        accessKeyId: this.AWS_ACCESS_KEY,
        secretAccessKey: this.AWS_SECRET_KEY,
      },
    });

    this.upload = multer({
      storage: multerS3({
        s3: this.client,
        bucket: this.AWS_BUCKET,
        acl: "public-read",
        contentType(req, file, callback) {
          callback(null, file.mimetype);
        },
        contentDisposition: "inline",
        metadata: function (req, file, cb) {
          cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
          const parseName = path.parse(file.originalname);
          const filename = parseName.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now() + parseName.ext;
          cb(null, filename);
        },
      }),
    });
  }
}

export default UploadMiddleware;
