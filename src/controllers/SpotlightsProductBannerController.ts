import { RequestHandler } from "express";
import { prisma } from "../configs/database";
import ApiResponse from "../utils/ApiResponse";
import HttpError from "../utils/HttpError";
import SpotlightProductBannerValidator from "../validators/SpotlightProductBannerValidator";

class SpotlightsProductBannerController {
  private apiResponse = new ApiResponse();
  private validators = new SpotlightProductBannerValidator();

  get: RequestHandler = async (req, res) => {
    const spotlightsProductBanners = await prisma.spotlightsProductBanners.findMany({
      include: {
        product: {
          include: {
            variations: true,
          },
        },
      },
    });

    res.status(200).send(this.apiResponse.success(spotlightsProductBanners));
  };
  getById: RequestHandler = async (req, res) => {
    const id = this.validators.validateUUID.parse(req.params.id);

    const spotlightsProductBanner = await prisma.spotlightsProductBanners.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });
    if (!spotlightsProductBanner) throw new HttpError("Spotlights-productbanner niet gevonden", 404);

    res.status(200).send(this.apiResponse.success(spotlightsProductBanner));
  };

  create: RequestHandler = async (req, res) => {
    const data = this.validators.create.parse(req.body);

    const spotlightsProductBannerByProductId = await prisma.spotlightsProductBanners.findUnique({ where: { productId: data.productId } });
    if (spotlightsProductBannerByProductId)
      throw new HttpError("Sie haben bereits ein Spotlights-Banner mit diesem Produkt erstellt. Bitte wählen Sie ein anderes Produkt", 400);

    const spotlightsProductBanner = await prisma.spotlightsProductBanners.create({
      data: data,
    });

    res.status(200).send(this.apiResponse.success(spotlightsProductBanner));
  };

  update: RequestHandler = async (req, res) => {
    const id = this.validators.validateUUID.parse(req.params.id);
    const data = this.validators.update.parse(req.body);

    const spotlightsProductBanner = await prisma.spotlightsProductBanners.findUnique({ where: { id: id } });
    if (!spotlightsProductBanner) throw new HttpError("Spotlights-productbanner niet gevonden", 404);

    const updatedSpotlightProductBanner = await prisma.spotlightsProductBanners.update({
      where: {
        id: id,
      },
      data: data,
    });

    res.status(200).send(this.apiResponse.success(updatedSpotlightProductBanner));
  };

  delete: RequestHandler = async (req, res) => {
    const id = this.validators.validateUUID.parse(req.params.id);

    const spotlightsProductBanner = await prisma.spotlightsProductBanners.findUnique({ where: { id } });
    if (!spotlightsProductBanner) throw new HttpError("Spotlights-productbanner niet gevonden", 404);

    const deletedSpotlightProductBanner = await prisma.spotlightsProductBanners.delete({
      where: {
        id,
      },
    });

    res.status(200).send(this.apiResponse.success(deletedSpotlightProductBanner));
  };
}

export default SpotlightsProductBannerController;
