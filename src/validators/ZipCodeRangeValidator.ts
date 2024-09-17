import { z } from "zod";
import BaseValidator from "./BaseValidator";

class ZipCodeRangeValidator extends BaseValidator {
  createZipCodeRange = z.object({
    lockdownDay: z.number().positive(),
    zipCode: z.string().refine(
      (value) => {
        if (!/\d{4}(-\d{4})?/.test(value)) {
          return false; // Invalid format
        }

        // Split the value into parts
        const parts = value.split("-");

        // If it's a range
        if (parts.length === 2) {
          const [start, end] = parts.map(Number);
          return start < end; // Validate range
        }

        return true; // Single number
      },
      { message: "Invalid zip code format or range." },
    ),
  });

  updateZipCodeRange = this.createZipCodeRange.partial().merge(
    z.object({
      // zipCode: z.string().refine(
      //   (value) => {
      //     return /^\d+$/.test(value);
      //   },
      //   { message: "Zip code must be a numeric string." },
      // ),
      zipCode: z.string(),
    }),
  );
  filterZipCodes = z
    .object({
      q: z.string().optional(),
    })
    .optional();
}

export default ZipCodeRangeValidator;
