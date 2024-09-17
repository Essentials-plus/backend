// Define your custom error class

import { ErrorRequestHandler } from "express";

import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import * as z from "zod";
import HttpError from "./HttpError";

class ErrorConfig {
  static normalizeZodError(errors: z.ZodError): { field: string; message: string }[] {
    return errors.errors.map((error) => ({
      field: error.path.join(", "),
      message: `${error.message}`,
    }));
  }

  static ErrorMessage = class {
    invalid_type_error = "Invalid type provided for this field";
    required_error = "cannot be blank";
    minimum_error = "is too short";
    minimum_password_error = "must be 8 character";
    default_string_error = { invalid_type_error: this.invalid_type_error, required_error: this.required_error };
  };

  static getPrismaErrorMessage = (err: Prisma.PrismaClientKnownRequestError) => {
    switch (err.code) {
      case "P2000":
        return `The provided value for the column is too long for the column's type. Column: ${err.meta?.column_name}`;
      case "P2001":
        return `The record searched for in the where condition (${err.meta?.model_name}.${err.meta?.argument_name} = ${err.meta?.argument_value}) does not exist`;
      case "P2002":
        return `Unique constraint failed on the ${err.meta?.constraint}`;
      case "P2003":
        return `Foreign key constraint failed on the field: ${err.meta?.field_name}`;
      case "P2004":
        return `A constraint failed on the database: ${err.meta?.database_error}`;
      case "P2005":
        return `The value ${err.meta?.field_value} stored in the database for the field ${err.meta?.field_name} is invalid for the field's type`;
      case "P2006":
        return `The provided value ${err.meta?.field_value} for ${err.meta?.model_name} field ${err.meta?.field_name} is not valid`;
      case "P2007":
        return `Data validation error ${err.meta?.database_error}`;
      case "P2008":
        return `Failed to parse the query ${err.meta?.query_parsing_error} at ${err.meta?.query_position}`;
      case "P2009":
        return `Failed to validate the query: ${err.meta?.query_validation_error} at ${err.meta?.query_position}`;
      case "P2010":
        return `Raw query failed. Code: ${err.meta?.code}. Message: ${err.meta?.message}`;
      case "P2011":
        return `Null constraint violation on the ${err.meta?.constraint}`;
      case "P2012":
        return `Missing a required value at ${err.meta?.path}`;
      case "P2013":
        return `Missing the required argument ${err.meta?.argument_name} for field ${err.meta?.field_name} on ${err.meta?.object_name}.`;
      case "P2014":
        return `The change you are trying to make would violate the required relation '${err.meta?.relation_name}' between the ${err.meta?.model_a_name} and ${err.meta?.model_b_name} models.`;
      case "P2015":
        return `A related record could not be found. ${err.meta?.details}`;
      case "P2016":
        return `Query interpretation error. ${err.meta?.details}`;
      case "P2017":
        return `The records for relation ${err.meta?.relation_name} between the ${err.meta?.parent_name} and ${err.meta?.child_name} models are not connected.`;
      case "P2018":
        return `The required connected records were not found. ${err.meta?.details}`;
      case "P2019":
        return `Input error. ${err.meta?.details}`;
      case "P2020":
        return `Value out of range for the type. ${err.meta?.details}`;
      case "P2021":
        return `The table ${err.meta?.table} does not exist in the current database.`;
      case "P2022":
        return `The column ${err.meta?.column} does not exist in the current database.`;
      case "P2023":
        return `Inconsistent column data: ${err.meta?.message}`;
      case "P2024":
        return `Timed out fetching a new connection from the connection pool. (Current connection pool timeout: ${err.meta?.timeout}, connection limit: ${err.meta?.connection_limit})`;
      case "P2025":
        return `An operation failed because it depends on one or more records that were required but not found. ${err.meta?.cause}`;
      case "P2026":
        return `The current database provider doesn't support a feature that the query used: ${err.meta?.feature}`;
      case "P2027":
        return `Multiple errors occurred on the database during query execution: ${err.meta?.errors}`;
      case "P2028":
        return `Transaction API error: ${err.meta?.error}`;
      case "P2029":
        return `Query parameter limit exceeded error: ${err.meta?.message}`;
      case "P2030":
        return `Cannot find a fulltext index to use for the search, try adding a @@fulltext([Fields...]) to your schema`;
      case "P2031":
        return `Prisma needs to perform transactions, which requires your MongoDB server to be run as a replica set. See details: https://pris.ly/d/mongodb-replica-set`;
      case "P2033":
        return `A number used in the query does not fit into a 64 bit signed integer. Consider using BigInt as field type if you're trying to store large integers`;
      case "P2034":
        return `Transaction failed due to a write conflict or a deadlock. Please retry your transaction`;
      case "P2035":
        return `Assertion violation on the database: ${err.meta?.database_error}`;
      case "P2036":
        return `Error in external connector (id ${err.meta?.id})`;
      case "P2037":
        return `Too many database connections opened: ${err.meta?.message}`;

      default:
        return `Something went wrong: ${err.message}`;
    }
  };

  static ErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
    if (err) {
      console.log(err);
      if (err instanceof z.ZodError) {
        const newError = ErrorConfig.normalizeZodError(err);
        return res.status(403).send({ message: newError[0].message, issues: newError });
      } else if (err instanceof HttpError) {
        return res.status(err.statusCode || 400).send({ message: err.message, issues: [] });
      } else if (err instanceof PrismaClientKnownRequestError) {
        const errMessage = ErrorConfig.getPrismaErrorMessage(err);
        return res.status(400).send({ message: errMessage });
      } else {
        return res.status(500).send({ message: `Something went wrong! ${err.message}`, issues: [] });
      }
    }
    next();
  };
}

export default ErrorConfig;
