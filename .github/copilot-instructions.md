# Copilot Instructions - Essentials Plus Backend

## Architecture Overview

This is a TypeScript/Express.js backend for a meal subscription service with Stripe payments, weekly meal planning, and automated order processing. The system uses **Netherlands timezone (Europe/Amsterdam)** for all date operations via `getNetherlandsDate()` from [src/utils/index.ts](../src/utils/index.ts).

### Core Domain Concepts

- **Weekly Meal Plans**: Users subscribe to meal plans with calorie-based pricing (`CALORIE_PRICE` * total weekly calories)
- **Lockdown Days**: Each zip code has a lockdown day (ISO weekday 1-7) when orders auto-confirm if not manually confirmed
- **Auto-Confirm Orders**: Cron job runs daily checking if users passed their lockdown day without confirming - see [OrderScheduler.ts](../src/schedulers/OrderScheduler.ts)
- **Subscription Updates**: Monday cron job processes pending plan price changes via [PaymentUtils.ts](../src/utils/PaymentUtils.ts)

## Project Structure & Conventions

### Routing Architecture (src/routes/)

Three-tier routing system in [routes/index.ts](../src/routes/index.ts):
- **Admin routes** (`/api/admin/*`) - require `authMiddleware.validateAdmin`
- **User routes** (`/api/user/*`) - require `authMiddleware.validateUser` 
- **Public routes** (`/api/*`) - no auth required

Rate limiters applied per tier: `adminRateLimiter`, `userRateLimiter`, `publicRateLimiter`, `guestRateLimiter`

### Controllers Pattern

All controllers follow this structure:
```typescript
class XController {
  private apiResponse = new ApiResponse();
  private validators = new XValidator();
  
  methodName: RequestHandler = async (req, res) => {
    // Validate with Zod
    const data = await this.validators.schema.parseAsync(req.body);
    // Business logic
    res.status(200).send(this.apiResponse.success(result));
  };
}
```

### Validation Strategy (src/validators/)

All validators extend [BaseValidator.ts](../src/validators/BaseValidator.ts) which provides:
- `validateUUID` - UUID validation
- `validatePagination` - standard pagination params (limit, page, includePageCount)
- `strongPasswordSchema` - Dutch language error messages for password validation
- `errMsg` - consistent error message object

### Error Handling

1. Use `HttpError` class from [utils/HttpError.ts](../src/utils/HttpError.ts) for throwing errors:
   ```typescript
   throw new HttpError("User not found", 404);
   ```

2. Prisma errors auto-converted to readable messages via `ErrorConfig.getPrismaErrorMessage()` in [utils/ErrorConfig.ts](../src/utils/ErrorConfig.ts)

3. All routes use `express-async-errors` - no try/catch needed in route handlers

### Environment Configuration

Environment variables validated at startup using Zod schema in [src/env.ts](../src/env.ts). Access via:
```typescript
import { env } from "../env";
env.JWT_SECRET // type-safe, validated
```

### Database Patterns

**Prisma usage:**
- Client instance: `import { prisma } from "../configs/database"`
- Pagination: Use `prisma-extension-pagination` - `.paginate().withPages(options)`
- Exclusion helper: `Utils.prismaExclude("User", ["password"])` for selecting all fields except specified

**Key models:**
- `User` - has one `UserPlan`, belongs to `ZipCode`
- `UserPlan` - tracks `confirmOrderWeek` and `status` (pending/active/canceled)
- `PlanOrder` - created weekly with `mealsForTheWeek` JSON, linked to `UserPlan`
- `WeeklyMeal` - meal options per ISO week number
- `Order` - product orders (separate from meal subscriptions)

## Critical Developer Knowledge

### Stripe Integration

- Webhook at `/webhook/stripe` uses `express.raw()` middleware - see [routes/webhook.ts](../src/routes/webhook.ts)
- Payment utilities in [utils/PaymentUtils.ts](../src/utils/PaymentUtils.ts) handle subscription CRUD
- Dynamic pricing created per update: `stripe.prices.create()` with calculated amounts
- Product orders use Checkout Sessions, meal subscriptions use Subscriptions API

### Time & Scheduling

**Always use `getNetherlandsDate()`** from [utils/index.ts](../src/utils/index.ts) instead of `new Date()` or `moment()`:
```typescript
const now = getNetherlandsDate(); // returns moment.tz(..., "Europe/Amsterdam")
```

**Cron jobs** (in [src/index.ts](../src/index.ts)):
- `"0 0 * * 1"` - Weekly on Monday: auto-update pending plan prices
- See [OrderScheduler.ts](../src/schedulers/OrderScheduler.ts) for daily order confirmation logic

### Authentication Flow

1. Admin: JWT verified via `authMiddleware.validateAdmin` - checks `Admin` table
2. User: JWT verified via `authMiddleware.validateUser` - checks `User` table, blocks if `status: "blocked"`
3. Guest: `authMiddleware.validateGuestUser` - accepts JWT OR generates `guestId` (UUID or email)
4. Public: `authMiddleware.validatePublicUser` - always passes, optionally sets `guestId`

Access user in handlers: `req.user.id` or `req.guestId`

### Email System

Templates in [src/templates/emails/](../src/templates/emails/) return HTML strings. Send via:
```typescript
import { sendEmailWithNodemailer } from "../utils/sender";
await sendEmailWithNodemailer(subject, recipientEmails, htmlTemplate({ ...vars }));
```

Common templates: order confirmations, meal reminders, crash reports, low stock alerts

### Calorie Calculation

[CalorieCalculator.ts](../src/utils/CalorieCalculator.ts) computes:
- `calculateUserCalorie(user)` - BMR/TDEE based on user profile
- `calculateUserPlanPrice(user)` - `totalKcal * CALORIE_PRICE + SHIPPING_CHARGE`

Used in auto-confirm orders and subscription updates.

## Development Workflows

### Setup & Database
```bash
npm install
npm run unify              # Generate Prisma client
npm run migrate:dev        # Run migrations
npm run seed:all           # Seed admin, meals, products, zipcodes
```

### Development
```bash
npm run dev                # Start with nodemon
npm run lint:fix           # Auto-fix ESLint issues
```

### Building for Production
```bash
npm run build              # Compile TypeScript + copy non-TS files (tscp)
npm start                  # Run compiled code
```

### Seeding Data
Individual seeds in [src/seeds/](../src/seeds/):
- `seed:admin` - Create admin users from env.ADMIN
- `seed:meals` - Populate meal library
- `seed:products` - Product catalog
- `seed:weeklyMeals` - Weekly meal schedules
- `seed:zipcode` - Zip codes with lockdown days

## Common Pitfalls

1. **Don't use raw Date/moment** - always use `getNetherlandsDate()` for consistency
2. **Webhook routes** must use `express.raw()` not `express.json()` - see [routes/webhook.ts](../src/routes/webhook.ts)
3. **Week numbers** are ISO weeks (1-52/53) via `moment.isoWeek()`
4. **Passwords** validated with Dutch error messages in `BaseValidator.strongPasswordSchema`
5. **Tax percentages** stored as enum `TAX9`/`TAX21` mapping to "9"/"21" strings
6. **Product variations** and attributes stored as JSON - see Product model relations
7. **Auto-confirm** checks `oneDayBehind` lockdown day, not current day
