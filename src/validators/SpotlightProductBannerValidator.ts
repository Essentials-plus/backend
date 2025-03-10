import { z } from "zod";
import BaseValidator from "./BaseValidator";

class SpotlightProductBannerValidator extends BaseValidator {
  create = z.object({
    productId: this.validateUUID,
    title: z.string().min(1),
    image: z.string().url(),
  });
  update = z.object({
    productId: this.validateUUID,
    title: z.string().min(1),
    image: z.string().url(),
  });
  delete = z.object({
    id: this.validateUUID,
  });
}

export default SpotlightProductBannerValidator;
