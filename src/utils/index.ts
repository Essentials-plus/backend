import { Prisma } from "@prisma/client";
import slugify from "slugify";
import { prisma } from "../configs/database";
import HttpError from "./HttpError";

import moment, { Moment } from "moment-timezone";
import { env } from "../env";

export const getNetherlandsDate = (date?: Date | string | Moment) => moment.tz(date, "Europe/Amsterdam");

type A<T extends string> = T extends `${infer U}ScalarFieldEnum` ? U : never;
type Entity = A<keyof typeof Prisma>;
type Keys<T extends Entity> = Extract<keyof (typeof Prisma)[keyof Pick<typeof Prisma, `${T}ScalarFieldEnum`>], string>;
class Utils {
  static shuffleArray(array: any[]) {
    const shuffledArray = [...array];
    for (let i = shuffledArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
    }
    return shuffledArray;
  }

  static prismaExclude = function <T extends Entity, K extends Keys<T>>(type: T, omit: K[]) {
    type Key = Exclude<Keys<T>, K>;
    type TMap = Record<Key, true>;
    const result: TMap = {} as TMap;
    for (const key in Prisma[`${type}ScalarFieldEnum`]) {
      if (!omit.includes(key as K)) {
        result[key as Key] = true;
      }
    }
    return result;
  };

  static getCurrentWeekNumber(date?: string | Date | Moment): number {
    // If a date is provided, use it; otherwise, use the current date
    const momentDate = getNetherlandsDate(date);
    return momentDate.isoWeek();
  }

  static dayOfTheWeek(d?: Date | string | Moment) {
    const getDate = getNetherlandsDate(d);
    const dayNumber = getDate.isoWeekday();
    // return dayNumber === 0 ? 7 : dayNumber;
    return dayNumber;
  }

  static afterLockdownDay = async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { zipCode: true } });

    if (!user) throw new HttpError("User not found", 404);
    const lockdownDay = user.zipCode?.lockdownDay;

    if (!lockdownDay) throw new HttpError("User has no subscription purchased yet.", 404);

    const dayOfTheWeek = this.dayOfTheWeek();

    const currentWeek = this.getCurrentWeekNumber();

    return {
      isAfterLockdownDay: lockdownDay < dayOfTheWeek,
      currentWeek,
      user,
      dayOfTheWeek,
      lockdownDay,
    };
  };
  static sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };
  static isMinutesAhead(time1: Date, time2: Date, minutes: number = 15): boolean {
    // Parse the time strings into Date objects
    const date1 = new Date(time1);
    const date2 = new Date(time2);

    // Calculate the difference in milliseconds
    const diffInMilliseconds = date2.getTime() - date1.getTime();

    // Convert the difference to minutes
    const diffInMinutes = diffInMilliseconds / (1000 * 60);
    // Check if the difference is equal to the specified minutes
    return diffInMinutes >= minutes;
  }
  static generateCombinations<T>(arrays: T[][], currentIndex: number = 0, currentCombination: T[] = []): T[][] {
    if (currentIndex === arrays.length) {
      // If currentIndex equals the length of arrays, we've reached the end
      // We return the current combination
      return [currentCombination];
    }

    const combinations: T[][] = [];

    // Iterate over the current array of options
    for (const option of arrays[currentIndex]) {
      // Recursively call the function with the next index and the updated combination
      const subCombinations = this.generateCombinations(arrays, currentIndex + 1, [...currentCombination, option]);
      combinations.push(...subCombinations);
    }

    return combinations;
  }

  static groupAttributeIdsByAttributeId(attributeTerms: any[]): string[][] {
    const groups: { [key: string]: string[] } = attributeTerms.reduce((acc, term) => {
      const attrId = term.attribute.id;
      if (!acc[attrId]) {
        acc[attrId] = [];
      }
      acc[attrId].push(term.id);
      return acc;
    }, {});

    const result: string[][] = Object.values(groups);

    return result;
  }

  static slugifyString = (string: string) => {
    return slugify(string, {
      lower: true,
      trim: true,
    });
  };

  static getAdminResetPasswordLink = (token: string) => {
    return `${env.ADMIN_CLIENT_URL}/reset-password?token=${token}`;
  };

  static getAdminConfirmEmailLink = (token: string) => {
    return `${env.ADMIN_CLIENT_URL}/confirm-email?token=${token}`;
  };

  static getShippingAmount = (amount: number) => {
    const minimumOrderValueForFreeShipping = Number(env.MINIMUM_ORDER_VALUE_FOR_FREE_SHIPPING);
    const shippingCharge = env.SHIPPING_CHARGE;

    if (typeof amount === "number" && amount > 0 && amount < minimumOrderValueForFreeShipping) {
      return shippingCharge;
    }
    return 0;
  };
}

export default Utils;
