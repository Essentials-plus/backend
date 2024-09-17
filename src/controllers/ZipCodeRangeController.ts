import { Prisma } from "@prisma/client";
import axios from "axios";
import { RequestHandler } from "express";
import { prisma } from "../configs/database";
import { env } from "../env";
import ApiResponse from "../utils/ApiResponse";
import HttpError from "../utils/HttpError";
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
  };

  updateZipCodeRange: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);
    const value = await this.validators.updateZipCodeRange.parseAsync(req.body);

    const zipCode = await prisma.zipCode.update({ where: { id }, data: value });

    if (!zipCode) throw new HttpError("Postcode niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(zipCode, { message: "Postcode bijgewerkt" }));
  };
  deleteZipCodeRange: RequestHandler = async (req, res) => {
    const id = await this.validators.validateUUID.parseAsync(req.params.id);

    const zipCode = await prisma.zipCode.delete({ where: { id } });
    if (!zipCode) throw new HttpError("Postcode niet gevonden", 404);
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
    const zipCode = String(req.params.code).slice(0, 4);

    const houseNumber = req.params.house;
    if (!zipCode || !houseNumber) throw new HttpError("Postcode niet gevonden", 404);
    if (zipCode.length < 4 || (req.params.code || "").length > 6) throw new HttpError("ongeldige postcode", 403);

    const zipCodeExists = await prisma.zipCode.findFirst({
      where: {
        zipCode: {
          startsWith: zipCode,
        },
      },
    });

    if (!zipCodeExists) throw new HttpError("Uw postcode valt buiten bereik", 403);
    let zipcodeData;
    try {
      const API_KEY = env.ZIPCODE_API_KEY;

      const { data } = await axios.get(`https://api.postcodeapi.nu/v3/lookup/${zipCodeExists.zipCode}/${houseNumber}`, {
        headers: {
          "X-Api-Key": API_KEY,
        },
      });

      zipcodeData = data;
    } catch (error) {
      throw new HttpError("Bron niet gevonden", 404);
    }
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
