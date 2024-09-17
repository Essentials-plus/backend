import { z } from "zod";
import ErrorConfig from "../utils/ErrorConfig";

class BaseValidator {
  public errMsg = new ErrorConfig.ErrorMessage();

  public validateUUID = z.string(this.errMsg.default_string_error).uuid({
    message: "Invalid uuid format",
  });
  public validateSearchQuery = z.string().optional();

  public required_string = z.string(this.errMsg.default_string_error).min(1, this.errMsg.minimum_error);

  public validatePagination = z.object({
    limit: z.coerce.number().optional().nullable(),
    page: z.coerce.number().optional(),
    includePageCount: z.coerce.boolean().optional(),
  });

  public strongPasswordSchema = z
    .string()
    .min(8, "Wachtwoord moet minstens 8 tekens lang zijn")
    .regex(/[A-Z]/, "Wachtwoord moet minstens één hoofdletter bevatten")
    .regex(/[a-z]/, "Wachtwoord moet minstens één kleine letter bevatten")
    .regex(/[0-9]/, "Wachtwoord moet minstens één cijfer bevatten")
    .regex(/[^A-Za-z0-9]/, "Wachtwoord moet minstens één speciaal teken bevatten");
}

export default BaseValidator;
