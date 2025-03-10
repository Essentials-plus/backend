import { Prisma } from "@prisma/client";
import deepmerge from "deepmerge";
import { RequestHandler } from "express";
import { prisma } from "../configs/database";
import ApiResponse from "../utils/ApiResponse";
import HttpError from "../utils/HttpError";
import RawDataValidator from "../validators/RawDataValidator";

class RawDataController {
  private apiResponse = new ApiResponse();
  private validators = new RawDataValidator();

  get: RequestHandler = async (req, res) => {
    const identifier = this.validators.identifier.parse(req.params.identifier);

    let rawDataRow = await prisma.rawData.findUnique({
      where: { identifier },
    });
    if (!rawDataRow) {
      rawDataRow = await prisma.rawData.create({
        data: {
          identifier,
          data: {},
        },
      });
    }

    res.status(200).send(this.apiResponse.success(rawDataRow));
  };
  createOrUpdate: RequestHandler = async (req, res) => {
    const identifier = this.validators.identifier.parse(req.params.identifier);
    const { skipDeepMerge } = this.validators.queryOptions.parse(req.query);
    const { data } = this.validators.update.parse(req.body);

    let rawDataRow = await prisma.rawData.findUnique({
      where: { identifier },
    });

    if (!rawDataRow) {
      rawDataRow = await prisma.rawData.create({
        data: {
          identifier,
          data: {},
        },
      });
    }

    const finalData = skipDeepMerge ? data : deepmerge(rawDataRow.data as Object, data);
    const json = { data: finalData } as unknown as Prisma.JsonObject;

    const updatedRawDataRow = await prisma.rawData.update({
      where: { identifier },
      data: json,
    });

    res.status(200).send(this.apiResponse.success(updatedRawDataRow));
  };
  delete: RequestHandler = async (req, res) => {
    const identifier = this.validators.identifier.parse(req.params.identifier);

    const rawDataRow = await prisma.rawData.findUnique({
      where: { identifier },
    });
    if (!rawDataRow) throw new HttpError("Geen gegevens gevonden", 404);

    const deletedRawDataRow = await prisma.rawData.delete({
      where: { identifier },
    });

    res.status(200).send(this.apiResponse.success(deletedRawDataRow));
  };
}

export default RawDataController;
