import { z } from "zod";
import BaseValidator from "./BaseValidator";

class RawDataValidator extends BaseValidator {
  update = z.object({
    data: z.object({}).passthrough(),
  });
  create = z.object({
    data: z.object({}).passthrough(),
  });
  identifier = z.string();

  queryOptions = z.object({
    skipDeepMerge: z.coerce.boolean().optional(),
  });
}

export default RawDataValidator;
