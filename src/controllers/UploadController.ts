import { RequestHandler } from "express";
import ApiResponse from "../utils/ApiResponse";
class UploadController {
  private apiResponse = new ApiResponse();
  uploadFile: RequestHandler = async (req, res) => {
    if (!req.file) throw new Error("File not uploaded");
    res.status(200).send(this.apiResponse.success(req.file));
  };
  uploadFiles: RequestHandler = async (req, res) => {
    if (!req.files) throw new Error("File not uploaded");
    res.status(200).send(this.apiResponse.success(req.files));
  };
}

export default UploadController;
