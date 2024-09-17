import { PrismaClient } from "@prisma/client";

interface PaginationOptions {
  first?: number;
  after?: string;
  where?: Record<string, unknown>;
  orderBy?: Record<string, "asc" | "desc">;
  include?: { [key: string]: boolean };
}

interface PrismaClientWithIndexSignature extends PrismaClient {
  [key: string]: any;
}

class PaginationService {
  private readonly prisma: PrismaClientWithIndexSignature;

  constructor(prisma: any) {
    this.prisma = prisma as PrismaClientWithIndexSignature;
  }

  async paginate(model: string, options: PaginationOptions): Promise<{ data: any[]; pagination: { hasNextPage: boolean; nextCursor?: string } }> {
    const { first = 10, after, where = {}, orderBy = {} } = options;

    let cursor: string | undefined;
    if (after) {
      // Decode the cursor from base64 (optional for security)
      cursor = Buffer.from(after, "base64").toString();
    }

    const results: any[] = await (this.prisma[model] as any).findMany({
      where,
      skip: cursor ? 1 : 0, // Skip the first record if using a cursor
      take: first + 1, // Fetch one more than requested for hasNext check
      orderBy,
      include: options.include || {},
    });

    const hasNextPage = results.length > first;
    const data = hasNextPage ? results.slice(0, first) : results;

    const nextCursor = hasNextPage ? Buffer.from(results[first - 1].id).toString("base64") : undefined;

    return {
      data,
      pagination: {
        hasNextPage,
        nextCursor,
      },
    };
  }
}

export { PaginationOptions, PaginationService };
