import { Prisma } from "@prisma/client";
import { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../configs/database";
import Utils from "../utils";
import ApiResponse from "../utils/ApiResponse";
import HttpError from "../utils/HttpError";
import { deleteGetValidatedZipCodeInfoCache } from "../utils/node-cache";
import ZipCodeRangeValidator from "../validators/ZipCodeRangeValidator";

class ZipCodeRangeController {
  private apiResponse = new ApiResponse();
  private validators = new ZipCodeRangeValidator();

  createZipCodeRange: RequestHandler = async (req, res) => {
    const value = await this.validators.createZipCodeRange.parseAsync(req.body);

    if (typeof value.zipCode === "string" && value.zipCode.includes("-")) {
      const [start, end] = value.zipCode.split("-").map(Number);

      const zipCodesInRange = Array.from({ length: end - start + 1 }, (_, i) => ({
        lockdownDay: value.lockdownDay,
        zipCode: (start + i).toString(),
      }));

      const zipCodes = await prisma.zipCode.createMany({
        data: zipCodesInRange,
        // skipDuplicates: true,
      });

      res.status(200).send(this.apiResponse.success({ total: zipCodes.count }, { message: `Zip code from ${start} to ${end} created` }));
    } else {
      const zipCode = await prisma.zipCode.create({ data: { ...value } });
      res.status(200).send(this.apiResponse.success({ zipCode }, { message: "Postcode aangemaakt" }));
    }

    deleteGetValidatedZipCodeInfoCache();
  };

  updateZipCodeRange: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);
    const value = await this.validators.updateZipCodeRange.parseAsync(req.body);

    const zipCode = await prisma.zipCode.update({ where: { id }, data: value });

    if (!zipCode) throw new HttpError("Postcode niet gevonden", 404);

    deleteGetValidatedZipCodeInfoCache();
    res.status(200).send(this.apiResponse.success(zipCode, { message: "Postcode bijgewerkt" }));
  };
  deleteZipCodeRange: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const zipCode = await prisma.zipCode.delete({ where: { id } });
    if (!zipCode) throw new HttpError("Postcode niet gevonden", 404);

    deleteGetValidatedZipCodeInfoCache();
    res.status(200).send(this.apiResponse.success(zipCode, { message: "Postcode verwijderd" }));
  };
  getZipCodeRange: RequestHandler = async (req, res) => {
    const paginationOptions = await this.validators.validatePagination.parseAsync(req.query);
    const filters = await this.validators.filterZipCodes.parseAsync(req.query);

    const q = filters?.q;

    const whereClause: Prisma.ZipCodeWhereInput = {};

    if (q) {
      whereClause.zipCode = {
        contains: q,
        mode: "insensitive",
      };
    }

    const [zipCodes, meta] = await prisma.zipCode
      .paginate({
        orderBy: {
          zipCode: "asc",
        },
        where: whereClause,
      })
      .withPages(paginationOptions);

    res.status(200).send(this.apiResponse.success(zipCodes, { meta }));
  };
  getZipCodeById: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const zipCode = await prisma.zipCode.findUnique({ where: { id } });

    if (!zipCode) throw new HttpError("Postcode niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(zipCode));
  };

  checkZipCode: RequestHandler = async (req, res) => {
    const zipCode = String(req.params.code);

    const houseNumber = req.params.house;
    const { skipDbCheck } = z
      .object({
        skipDbCheck: z.coerce.boolean().optional(),
      })
      .parse(req.query);

    const { zipcodeData } = await Utils.getValidatedZipCodeInfo({ zipCode, houseNumber, skipDbCheck });

    res.status(200).send(this.apiResponse.success(zipcodeData));
  };

  updateNewZipCode: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);
    const value = await this.validators.updateZipCodeRange.parseAsync(req.body);

    const zipCode = await prisma.zipCode.update({ where: { id }, data: value });

    if (!zipCode) throw new HttpError("Postcode niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(zipCode, { message: "Postcode bijgewerkt" }));
  };
}

export default ZipCodeRangeController;
