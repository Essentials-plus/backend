import { Prisma, ProductAttribute, ZipCode } from "@prisma/client";
import slugify from "slugify";
import { prisma } from "../configs/database";
import HttpError from "./HttpError";

import axios from "axios";
import moment, { Moment } from "moment-timezone";
import { env } from "../env";
import { appCache, getValidatedZipCodeInfoCacheKeyPreffix } from "./node-cache";

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

  static getNextConfirmOrderWeekNumber(currentConfirmOrderWeek: number) {
    return currentConfirmOrderWeek + 1 > 52 ? 1 : currentConfirmOrderWeek + 1;
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
      isAfterLockdownDay: lockdownDay <= dayOfTheWeek,
      currentWeek,
      user,
      dayOfTheWeek,
      lockdownDay,
    };
  };
  static getNextSundayDaysCountISO = (isAfterLockdownDay: boolean = false) => {
    const today = getNetherlandsDate().isoWeekday(); // Get the current ISO weekday (1 is Monday, 7 is Sunday)
    let daysUntilNextSunday = 7 - today; // Calculate days until next Sunday

    if (isAfterLockdownDay) {
      // If lockdown day has passed, we want to skip the upcoming Sunday
      daysUntilNextSunday += 7; // Add 7 more days to move to the 2nd next Sunday
    }

    return daysUntilNextSunday;
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

  static removeUnnecessaryWhereClause(obj: Record<string, any>) {
    // eslint-disable-next-line no-unused-vars
    const { categories, ...rest } = obj;

    return obj;
  }

  static async findHighestPriceProduct() {
    const cacheKey = "findHighestPriceProduct";
    const cached = appCache.get<{ highestProductPrice: number; highestProduct: Prisma.ProductGetPayload<{ include: { variations: true } }> }>(
      cacheKey,
    );

    if (cached) return cached;

    // Step 1: Find the highest price among simple products
    const highestProduct = await prisma.product.findFirst({
      where: {
        highestPrice: {
          not: null,
        },
      },
      orderBy: {
        highestPrice: "desc",
      },
    });

    const highestProductPrice = highestProduct?.highestPrice!;

    appCache.set(cacheKey, { highestProduct, highestProductPrice }, 60 * 2); // Expire after 2 minutes

    return { highestProduct, highestProductPrice };
  }
  static attributeSortByOrder = (product: Prisma.ProductGetPayload<{ include: { attributes: true } }>) => {
    const attributesInfo = product.attributesInfo;

    const attributesSortOrder = (product as any)?.attributesInfo?.sortOrder as string[] | undefined;
    if (attributesSortOrder && Array.isArray(attributesSortOrder) && attributesSortOrder.length > 0) {
      const newAttributesOrder: ProductAttribute[] = [];
      attributesSortOrder.forEach((orderId) => {
        const findAttribute = product.attributes.find((attr) => attr.id === orderId);
        if (findAttribute) {
          newAttributesOrder.push({ ...findAttribute, ...(attributesInfo ? (attributesInfo as any).info[findAttribute.id] : {}) });
        }
      });

      return newAttributesOrder;
    } else {
      return product.attributes;
    }
  };

  static getValidatedZipCodeInfo = async ({ zipCode, houseNumber, skipDbCheck }: { zipCode: string; houseNumber: string; skipDbCheck?: boolean }) => {
    const cacheKey = `${getValidatedZipCodeInfoCacheKeyPreffix}:${zipCode}-${houseNumber}${skipDbCheck ? "-skipDbCheck" : ""}`;

    const cached = appCache.get<{ zipcodeData: any; zipCode?: ZipCode } | HttpError>(cacheKey);
    if (cached) {
      if (cached instanceof HttpError) {
        throw cached;
      }
      return cached;
    }

    if (!zipCode || !houseNumber) throw new HttpError("Postcode niet gevonden", 404);
    const first4Digits = zipCode.substring(0, 4);
    if (zipCode.length < 4 || zipCode.length > 6 || first4Digits.length < 4) throw new HttpError("ongeldige postcode", 403);

    let zipCodeExists;
    if (!skipDbCheck) {
      zipCodeExists = await prisma.zipCode.findFirst({
        where: {
          zipCode: {
            startsWith: first4Digits,
          },
        },
      });

      if (!zipCodeExists) throw new HttpError("Uw postcode valt buiten bereik", 403);
    }
    let zipcodeData;
    try {
      const API_KEY = env.ZIPCODE_API_KEY;
      const { data } = await axios.get(`https://api.postcodeapi.nu/v3/lookup/${zipCode}/${houseNumber}`, {
        headers: {
          "X-Api-Key": API_KEY,
        },
      });

      zipcodeData = data;
    } catch (error) {
      const httpError = new HttpError("Bron niet gevonden", 404);
      appCache.set(cacheKey, httpError, 60 * 10); // Expire after 10 minutes
      throw httpError;
    }

    const result = { zipcodeData, zipCode: skipDbCheck ? undefined : zipCodeExists };
    appCache.set(cacheKey, result, 60 * 10); // Expire after 10 minutes
    return result;
  };

  static getNextLockdownDate = (lockDownDay: number) => {
    const today = getNetherlandsDate(); // Current date
    const todayDay = today.isoWeekday(); // ISO: Monday = 1, Sunday = 7

    // Calculate days until the next lockdown day
    const daysUntilLockdown = lockDownDay > todayDay ? lockDownDay - todayDay : 7 - (todayDay - lockDownDay);

    const nextLockdownDate = today.add(daysUntilLockdown, "days");

    return nextLockdownDate.toDate(); // ISO Netherlands format
  };

  static getNextDeliveryDate = (date: Date) => {
    return moment(date).add(2, "days");
  };
}

export default Utils;

export const getEmailFooter = () => {
  return {
    html: `
    <div class="contact-info">
        <p>Met gezonde groet,<br>
        <strong>Het EssentialsPlus-team</strong> 🌟</p>
        <p>
          <a href="mailto:service@essentialsplus.eu" style="color: #317673;">service@essentialsplus.eu</a><br>
          <a href="tel:0132076877" style="color: #317673;">013 207 68 77</a>
        </p>
    </div>`,
    css: `
      .contact-info {
        text-align: center;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #edf2f7;
      }
      `,
  };
};
