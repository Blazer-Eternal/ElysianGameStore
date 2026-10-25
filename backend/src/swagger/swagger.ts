import swaggerUi from "swagger-ui-express";

import { AgeRating } from "../enums/ageRatingEnum";
import { DiscountType } from "../enums/discountTypeEnum";
import { GameKeyStatus } from "../enums/gameKeyStatusEnum";
import { GameStatus } from "../enums/gameStatusEnum";
import { MediaType } from "../enums/mediaTypeEnum";
import { OrderStatus } from "../enums/orderStatusEnum";
import { PaymentProvider } from "../enums/paymentProviderEnum";
import { Platform } from "../enums/platformEnum";
import { PayoutStatus } from "../enums/payoutStatusEnum";
import { PromotionType } from "../enums/promotionTypeEnum";
import { PublisherStatus } from "../enums/publisherStatusEnum";
import { RefundStatus } from "../enums/refundStatusEnum";
import { Role } from "../enums/roleEnum";
import { UserStatus } from "../enums/userStatusEnum";
import { ModerationStatus } from "../enums/moderationStatusEnum";

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

// The access token travels two ways: `Authorization: Bearer <token>` for API
// clients and the HTTP-only `elysian_access` cookie set by POST /api/auth/login.
const bearerAuth = {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
  description:
    "Access token returned in `data.accessToken` by POST /api/auth/login (the `Bearer ` prefix is required for the header form).",
};

const cookieAuth = {
  type: "apiKey",
  in: "cookie",
  name: "elysian_access",
  description:
    "HTTP-only access cookie set on login/refresh — sent automatically when the client uses `credentials: true`.",
};

// Applied per-operation, so public routes stay open.
const secured = [{ bearerAuth: [] }, { cookieAuth: [] }];

// The default local port comes from PORT in .env (server.ts falls back to 5000).
const serverUrl = `http://localhost:${process.env.PORT || 5000}`;

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

const validationErrorResponse = () => ({
  description: "Validation failed",
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ValidationError" },
    },
  },
});

// Success envelope used across the API: { success, message, data }
const ok = (description: string, dataSchema?: unknown) => ({
  description,
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          ...(dataSchema ? { data: dataSchema } : {}),
        },
      },
    },
  },
});

// Every resource id in the store is a UUID (see validators/helpers.ts).
const idParam = (name: string, description: string) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string", format: "uuid" },
});

// ---------------------------------------------------------------------------
// OpenAPI document
// ---------------------------------------------------------------------------

const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "Elysian Game Store API",
    version: "1.0.0",
    description:
      "REST API for the Elysian PC game store: catalog, cart, checkout, payments, library, reviews, " +
      "publisher tooling, payouts and admin moderation.\n\n" +
      "**Money.** Every amount is an integer number of *paisa* (1 NPR = 100 paisa). No floats, " +
      "no rounding: totals are recomputed server-side and snapshotted onto the order.\n\n" +
      "**Auth model.** Login returns a short-lived JWT `accessToken` *and* sets HTTP-only cookies " +
      "(`elysian_access`, plus `elysian_refresh` scoped to `/api/auth`). Send the token as " +
      "`Authorization: Bearer <accessToken>` or rely on the cookie — both are accepted.\n\n" +
      "**Roles.** `CUSTOMER`, `PUBLISHER`, `ADMIN`, `SUPPORT`. Route guards are coarse " +
      "(role / action); ownership rules (\"publisher may only edit their own games\") are enforced " +
      "inside the services.\n\n" +
      "**Errors.** Every failure — including 404s and validation errors — leaves as " +
      "`{ success: false, message, code?, details? }`.",
    contact: { name: "ElysianGameStore" },
    license: { name: "UNLICENSED" },
  },
  servers: [{ url: serverUrl, description: "Local development server" }],
  tags: [
    { name: "Health", description: "Liveness / database check" },
    { name: "Auth", description: "Register, login, token refresh, logout, current user" },
    { name: "Users", description: "Self-service profile and password" },
    { name: "Games", description: "Public catalog plus publisher game/build/media management" },
    { name: "Cart", description: "Authenticated shopping cart" },
    { name: "Orders", description: "Quote → create → pay → cancel (integer paisa)" },
    { name: "Payments", description: "Provider discovery, status polling and provider webhooks" },
    { name: "Library", description: "Owned games and signed download URLs" },
    { name: "Reviews", description: "Game reviews, ratings and helpful votes" },
    { name: "Wishlist", description: "Wishlist rows that feed the promotion fan-out" },
    { name: "Refunds", description: "Refund requests and eligibility checks" },
    { name: "Gifts", description: "Gift links: preview, redeem, history" },
    { name: "Keys", description: "Game key redemption and publisher key generation" },
    { name: "Promotions", description: "Store/publisher promotions and game fan-out" },
    { name: "Coupons", description: "Coupon preview plus admin CRUD" },
    { name: "Publisher", description: "Publisher application and profile" },
    { name: "Payouts", description: "Publisher payout preview/generation and admin release" },
    { name: "Play Sessions", description: "Playtime tracking for refunds and reviews" },
    { name: "Notifications", description: "In-app notification inbox" },
    { name: "Dashboard", description: "Role-scoped aggregate dashboards" },
    { name: "Admin", description: "Moderation, taxonomy, sweeps and the audit trail" },
  ],
  components: {
    securitySchemes: { bearerAuth, cookieAuth },
    parameters: {
      IdPath: {
        name: "id",
        in: "path",
        required: true,
        description: "Resource id (UUID)",
        schema: { type: "string", format: "uuid" },
      },
    },
    schemas: {
      // ---- generic envelopes ------------------------------------------------
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "You do not have a publisher account" },
          code: { type: "string", description: "Stable machine-readable code, present on AppErrors" },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: { field: { type: "string" }, message: { type: "string" } },
            },
            description: "Present on validation failures",
          },
        },
      },
      ValidationError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Validation failed" },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string", example: "email" },
                message: { type: "string", example: "Enter a valid email" },
              },
            },
          },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          pageSize: { type: "integer", example: 12 },
          total: { type: "integer", example: 42 },
        },
      },

      // ---- enums ------------------------------------------------------------
      Role: { type: "string", enum: Object.values(Role) },
      UserStatus: { type: "string", enum: Object.values(UserStatus) },
      ModerationStatus: { type: "string", enum: Object.values(ModerationStatus) },
      GameStatus: { type: "string", enum: Object.values(GameStatus) },
      OrderStatus: { type: "string", enum: Object.values(OrderStatus) },
      PaymentProvider: { type: "string", enum: Object.values(PaymentProvider) },
      Platform: { type: "string", enum: Object.values(Platform) },
      AgeRating: { type: "string", enum: Object.values(AgeRating) },
      MediaType: { type: "string", enum: Object.values(MediaType) },
      PromotionType: { type: "string", enum: Object.values(PromotionType) },
      DiscountType: { type: "string", enum: Object.values(DiscountType) },
      PublisherStatus: { type: "string", enum: Object.values(PublisherStatus) },
      PayoutStatus: { type: "string", enum: Object.values(PayoutStatus) },
      RefundStatus: { type: "string", enum: Object.values(RefundStatus) },
      GameKeyStatus: { type: "string", enum: Object.values(GameKeyStatus) },

      // ---- entities ---------------------------------------------------------
      AuthUser: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          username: { type: "string", example: "nightowl" },
          email: { type: "string", format: "email" },
          role: { $ref: "#/components/schemas/Role" },
        },
      },
      Genre: {
        type: "object",
        properties: { id: { type: "string", format: "uuid" }, name: { type: "string", example: "RPG" }, slug: { type: "string", example: "rpg" } },
      },
      Tag: {
        type: "object",
        properties: { id: { type: "string", format: "uuid" }, name: { type: "string", example: "Roguelike" }, slug: { type: "string", example: "roguelike" } },
      },
      Game: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          publisherId: { type: "string", format: "uuid" },
          title: { type: "string", example: "Neon Drifter" },
          slug: { type: "string", example: "neon-drifter" },
          shortDesc: { type: "string" },
          basePricePaisa: { type: "integer", example: 199900, description: "Integer paisa" },
          ageRating: { $ref: "#/components/schemas/AgeRating" },
          status: { $ref: "#/components/schemas/GameStatus" },
          isEarlyAccess: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      GameBuild: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          version: { type: "string", example: "1.4.2" },
          platform: { $ref: "#/components/schemas/Platform" },
          fileSizeBytes: { type: "integer" },
          checksumSha256: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
      Cart: {
        type: "object",
        properties: {
          items: { type: "array", items: { type: "object", properties: { gameId: { type: "string", format: "uuid" }, pricePaisa: { type: "integer" } } } },
          subtotalPaisa: { type: "integer" },
          discountPaisa: { type: "integer" },
          totalPaisa: { type: "integer" },
        },
      },
      Quote: {
        type: "object",
        properties: {
          subtotalPaisa: { type: "integer", example: 399800 },
          promotionDiscountPaisa: { type: "integer" },
          couponDiscountPaisa: { type: "integer" },
          taxPaisa: { type: "integer" },
          totalPaisa: { type: "integer", example: 359820 },
        },
      },
      Order: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          status: { $ref: "#/components/schemas/OrderStatus" },
          subtotalPaisa: { type: "integer" },
          totalPaisa: { type: "integer" },
          couponCode: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          paidAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      Payment: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          provider: { $ref: "#/components/schemas/PaymentProvider" },
          status: { type: "string", example: "SUCCESS" },
          amountPaisa: { type: "integer" },
          providerTxnId: { type: "string", nullable: true },
        },
      },
      LibraryEntry: {
        type: "object",
        properties: {
          gameId: { type: "string", format: "uuid" },
          title: { type: "string" },
          source: { type: "string", example: "order | key | gift" },
          revoked: { type: "boolean" },
        },
      },
      Review: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          gameId: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          recommend: { type: "boolean" },
          rating: { type: "integer", minimum: 1, maximum: 5, nullable: true },
          body: { type: "string", nullable: true },
          helpfulCount: { type: "integer" },
        },
      },
      Gift: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          token: { type: "string" },
          status: { type: "string", example: "PENDING | REDEEMED | EXPIRED" },
          recipientEmail: { type: "string", format: "email", nullable: true },
        },
      },
      GameKey: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          status: { $ref: "#/components/schemas/GameKeyStatus" },
          gameId: { type: "string", format: "uuid" },
        },
      },
      Promotion: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Monsoon Sale" },
          type: { $ref: "#/components/schemas/PromotionType" },
          value: { type: "integer", description: "Percent (1-90) or paisa off, depending on type" },
          startsAt: { type: "string", format: "date-time" },
          endsAt: { type: "string", format: "date-time" },
        },
      },
      Coupon: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          code: { type: "string", example: "WELCOME10" },
          discountType: { $ref: "#/components/schemas/DiscountType" },
          value: { type: "integer" },
          maxUses: { type: "integer" },
          isActive: { type: "boolean" },
        },
      },
      Publisher: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          ownerUserId: { type: "string", format: "uuid" },
          name: { type: "string", example: "Foxglove Interactive" },
          status: { $ref: "#/components/schemas/PublisherStatus" },
          payoutCurrency: { type: "string", example: "NPR" },
        },
      },
      Payout: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          publisherId: { type: "string", format: "uuid" },
          status: { $ref: "#/components/schemas/PayoutStatus" },
          grossPaisa: { type: "integer" },
          netPaisa: { type: "integer" },
          currency: { type: "string", example: "NPR" },
          periodStart: { type: "string", format: "date-time" },
          periodEnd: { type: "string", format: "date-time" },
        },
      },
      Notification: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          type: { type: "string", example: "PROMOTION_STARTS" },
          title: { type: "string" },
          read: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AdminUser: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          username: { type: "string", example: "nightowl" },
          email: { type: "string", format: "email" },
          role: { $ref: "#/components/schemas/Role" },
          status: { $ref: "#/components/schemas/UserStatus" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      TaxConfig: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "VAT" },
          rateBps: { type: "integer", example: 1300, description: "VAT rate in basis points (1300 = 13%)" },
          effectiveFrom: { type: "string", format: "date-time", description: "Latest row with effective_from <= now wins" },
        },
      },

      // ---- request bodies ---------------------------------------------------
      RegisterRequest: {
        type: "object",
        required: ["email", "username", "password"],
        properties: {
          email: { type: "string", format: "email", example: "alex@example.com" },
          username: { type: "string", minLength: 3, maxLength: 50, example: "alex.b" },
          password: { type: "string", minLength: 8, maxLength: 128 },
          birthDate: { type: "string", format: "date", description: "Drives the age-rating gate at checkout" },
          countryCode: { type: "string", minLength: 2, maxLength: 2 },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: { email: { type: "string", format: "email" }, password: { type: "string" } },
      },
      UpdateProfileRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          username: { type: "string", minLength: 3, maxLength: 50 },
          countryCode: { type: "string", minLength: 2, maxLength: 2 },
          birthDate: { type: "string", format: "date" },
        },
      },
      ChangePasswordRequest: {
        type: "object",
        required: ["currentPassword", "newPassword"],
        properties: {
          currentPassword: { type: "string" },
          newPassword: { type: "string", minLength: 8, maxLength: 128 },
        },
      },
      CreateGameRequest: {
        type: "object",
        required: ["title", "shortDesc"],
        properties: {
          title: { type: "string", minLength: 3, maxLength: 160 },
          shortDesc: { type: "string", minLength: 10, maxLength: 500 },
          longDesc: { type: "string", maxLength: 20000 },
          releaseDate: { type: "string", format: "date" },
          ageRating: { $ref: "#/components/schemas/AgeRating" },
          basePricePaisa: { type: "integer", minimum: 0, example: 199900 },
          isEarlyAccess: { type: "boolean" },
        },
      },
      UpdateGameRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          title: { type: "string", minLength: 3, maxLength: 160 },
          shortDesc: { type: "string", minLength: 10, maxLength: 500 },
          longDesc: { type: "string", maxLength: 20000, nullable: true },
          releaseDate: { type: "string", format: "date", nullable: true },
          ageRating: { $ref: "#/components/schemas/AgeRating" },
          basePricePaisa: { type: "integer", minimum: 0 },
          isEarlyAccess: { type: "boolean" },
        },
      },
      BuildRequest: {
        type: "object",
        required: ["version", "platform", "fileSizeBytes", "checksumSha256", "cdnUrl"],
        properties: {
          version: { type: "string", example: "1.4.2", description: "semver" },
          platform: { $ref: "#/components/schemas/Platform" },
          fileSizeBytes: { type: "integer", minimum: 1 },
          checksumSha256: { type: "string", pattern: "^[a-fA-F0-9]{64}$" },
          cdnUrl: { type: "string", format: "uri" },
          changelog: { type: "string", maxLength: 20000 },
          isActive: { type: "boolean" },
        },
      },
      MediaRequest: {
        type: "object",
        required: ["type", "url"],
        properties: {
          type: { $ref: "#/components/schemas/MediaType" },
          url: { type: "string", format: "uri" },
          sortOrder: { type: "integer", minimum: 0, maximum: 1000 },
        },
      },
      RequirementsRequest: {
        type: "object",
        minProperties: 1,
        description: "Provide `min` and/or `rec`; each row is one system-requirement set.",
        properties: {
          min: { $ref: "#/components/schemas/RequirementRow" },
          rec: { $ref: "#/components/schemas/RequirementRow" },
        },
      },
      RequirementRow: {
        type: "object",
        required: ["os", "cpu", "gpu", "ramGb", "storageGb"],
        properties: {
          os: { type: "string", example: "Windows 10 64-bit" },
          cpu: { type: "string" },
          gpu: { type: "string" },
          ramGb: { type: "integer", minimum: 1 },
          storageGb: { type: "integer", minimum: 1 },
          directx: { type: "string" },
        },
      },
      TaxonomyRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          genreIds: { type: "array", maxItems: 10, items: { type: "string", format: "uuid" } },
          tagIds: { type: "array", maxItems: 20, items: { type: "string", format: "uuid" } },
        },
      },
      QuoteRequest: {
        type: "object",
        properties: {
          gameIds: { type: "array", minItems: 1, maxItems: 50, items: { type: "string", format: "uuid" } },
          couponCode: { type: "string", maxLength: 40 },
        },
      },
      CreateOrderRequest: {
        type: "object",
        properties: {
          gameIds: { type: "array", minItems: 1, maxItems: 50, items: { type: "string", format: "uuid" }, description: "Omit to check out the cart" },
          couponCode: { type: "string", maxLength: 40 },
          giftRecipientEmail: { type: "string", format: "email", description: "Turns the order into a gift" },
        },
      },
      PayRequest: {
        type: "object",
        required: ["provider"],
        properties: {
          provider: { $ref: "#/components/schemas/PaymentProvider" },
          returnUrl: { type: "string", format: "uri" },
          idempotencyKey: { type: "string", minLength: 8, maxLength: 120, description: "Falls back to the Idempotency-Key header" },
        },
      },
      SimulatePaymentRequest: {
        type: "object",
        description: "Dev only (ENABLE_MOCK_PAYMENTS). Drives the real webhook code path.",
        properties: {
          provider: { $ref: "#/components/schemas/PaymentProvider" },
          status: { type: "string", enum: ["SUCCESS", "FAILURE"], default: "SUCCESS" },
        },
      },
      AddCartItemRequest: {
        type: "object",
        required: ["gameId"],
        properties: { gameId: { type: "string", format: "uuid" } },
      },
      CreateReviewRequest: {
        type: "object",
        required: ["gameId", "recommend"],
        properties: {
          gameId: { type: "string", format: "uuid" },
          recommend: { type: "boolean" },
          rating: { type: "integer", minimum: 1, maximum: 5 },
          body: { type: "string", maxLength: 5000 },
        },
      },
      UpdateReviewRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          recommend: { type: "boolean" },
          rating: { type: "integer", minimum: 1, maximum: 5 },
          body: { type: "string", maxLength: 5000 },
        },
      },
      RequestRefundRequest: {
        type: "object",
        required: ["orderItemId", "reason"],
        properties: {
          orderItemId: { type: "string", format: "uuid" },
          reason: { type: "string", minLength: 3, maxLength: 500 },
        },
      },
      RedeemGiftRequest: {
        type: "object",
        required: ["token"],
        properties: { token: { type: "string", minLength: 16, maxLength: 128 } },
      },
      RedeemKeyRequest: {
        type: "object",
        required: ["code"],
        properties: { code: { type: "string", minLength: 8, maxLength: 32 } },
      },
      GenerateKeysRequest: {
        type: "object",
        required: ["count"],
        properties: { count: { type: "integer", minimum: 1, maximum: 500 } },
      },
      CreatePromotionRequest: {
        type: "object",
        required: ["name", "type", "value", "startsAt", "endsAt"],
        properties: {
          name: { type: "string", minLength: 3, maxLength: 120 },
          type: { $ref: "#/components/schemas/PromotionType" },
          value: { type: "integer", minimum: 1, maximum: 1000000 },
          startsAt: { type: "string", format: "date-time" },
          endsAt: { type: "string", format: "date-time" },
          fundedBy: { type: "string", enum: ["STORE", "PUBLISHER"], description: "Publishers may only create PUBLISHER-funded promotions" },
        },
      },
      UpdatePromotionRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          name: { type: "string", minLength: 3, maxLength: 120 },
          startsAt: { type: "string", format: "date-time" },
          endsAt: { type: "string", format: "date-time" },
        },
      },
      AttachPromotionGameRequest: {
        type: "object",
        required: ["gameId"],
        properties: {
          gameId: { type: "string", format: "uuid" },
          discountPct: { type: "integer", minimum: 1, maximum: 90 },
        },
      },
      PreviewCouponRequest: {
        type: "object",
        properties: {
          gameIds: { type: "array", items: { type: "string", format: "uuid" } },
          code: { type: "string", maxLength: 40 },
        },
      },
      CreateCouponRequest: {
        type: "object",
        required: ["code", "discountType", "value", "maxUses"],
        properties: {
          code: { type: "string", minLength: 4, maxLength: 40, pattern: "^[A-Za-z0-9_-]+$" },
          discountType: { $ref: "#/components/schemas/DiscountType" },
          value: { type: "integer", minimum: 1, maximum: 1000000 },
          maxUses: { type: "integer", minimum: 1 },
          perUserLimit: { type: "integer", minimum: 1, maximum: 1000 },
          minOrderPaisa: { type: "integer", minimum: 0 },
          expiresAt: { type: "string", format: "date-time" },
          isActive: { type: "boolean" },
        },
      },
      UpdateCouponRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          maxUses: { type: "integer", minimum: 1 },
          perUserLimit: { type: "integer", minimum: 1 },
          minOrderPaisa: { type: "integer", minimum: 0 },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          isActive: { type: "boolean" },
        },
      },
      ApplyPublisherRequest: {
        type: "object",
        required: ["name", "legalName"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 120 },
          legalName: { type: "string", minLength: 2, maxLength: 160 },
          taxId: { type: "string", maxLength: 60 },
          payoutAccount: { type: "string", maxLength: 120 },
          payoutCurrency: { type: "string", enum: ["NPR", "USD"] },
        },
      },
      UpdatePublisherRequest: {
        type: "object",
        minProperties: 1,
        properties: {
          name: { type: "string", minLength: 2, maxLength: 120 },
          legalName: { type: "string", minLength: 2, maxLength: 160 },
          taxId: { type: "string", maxLength: 60 },
          payoutAccount: { type: "string", maxLength: 120 },
          payoutCurrency: { type: "string", enum: ["NPR", "USD"] },
        },
      },
      PayoutPeriodRequest: {
        type: "object",
        required: ["periodStart", "periodEnd"],
        properties: {
          periodStart: { type: "string", format: "date-time" },
          periodEnd: { type: "string", format: "date-time" },
        },
      },
      StartSessionRequest: {
        type: "object",
        required: ["gameId"],
        properties: { gameId: { type: "string", format: "uuid" } },
      },
      PublisherStatusRequest: {
        type: "object",
        required: ["status"],
        properties: { status: { $ref: "#/components/schemas/PublisherStatus" } },
      },
      PayoutStatusRequest: {
        type: "object",
        required: ["status"],
        properties: { status: { type: "string", enum: ["PAID", "CANCELLED"] } },
      },
      AdminUserUpdateRequest: {
        type: "object",
        minProperties: 1,
        description: "Provide `role` and/or `status`. Admins cannot change their own role or status.",
        properties: {
          role: { $ref: "#/components/schemas/Role" },
          status: { $ref: "#/components/schemas/UserStatus" },
        },
      },
      DecideRefundRequest: {
        type: "object",
        required: ["decision"],
        properties: {
          decision: { type: "string", enum: ["APPROVE", "REJECT"], description: "APPROVE executes the refund (paisa move + entitlement revocation) in one transaction" },
        },
      },
      ModerateReviewRequest: {
        type: "object",
        required: ["moderationStatus"],
        properties: { moderationStatus: { $ref: "#/components/schemas/ModerationStatus" } },
      },
      TaxConfigRequest: {
        type: "object",
        required: ["rateBps", "effectiveFrom"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 60, default: "VAT" },
          rateBps: { type: "integer", minimum: 0, maximum: 10000, example: 1300, description: "Basis points (1300 = 13%)" },
          effectiveFrom: { type: "string", format: "date-time", description: "Rows are append-only; the latest effective_from (<= now) wins" },
        },
      },
    },

    responses: {
      BadRequest: errorResponse("Invalid id or malformed request"),
      Unauthorized: errorResponse("Missing or invalid access token"),
      Forbidden: errorResponse("Authenticated but not allowed (wrong role / not the owner)"),
      NotFound: errorResponse("Resource not found"),
      Conflict: errorResponse("Unique-constraint or state conflict"),
      TooManyRequests: errorResponse("Rate limit exceeded"),
      InternalError: errorResponse("Internal server error"),
    },
  },

  // Auth applied per-operation via `security`, so public routes stay open.
  paths: {
    // ---------------- Health ----------------
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness + database ping",
        security: [],
        responses: {
          200: ok("Service status", {
            type: "object",
            properties: {
              status: { type: "string", example: "ok" },
              database: { type: "string", enum: ["up", "down"] },
              uptimeSeconds: { type: "integer" },
              latencyMs: { type: "integer" },
            },
          }),
        },
      },
    },

    // ---------------- Auth ----------------
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Create an account",
        description: "Everyone registers as `CUSTOMER`; admins promote users later. Rate-limited (auth bucket). Sets both auth cookies.",
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } } },
        responses: {
          201: ok("Account created", { user: { $ref: "#/components/schemas/AuthUser" }, accessToken: { type: "string" } }),
          400: validationErrorResponse(),
          409: { $ref: "#/components/responses/Conflict" },
          429: { $ref: "#/components/responses/TooManyRequests" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Exchange credentials for tokens",
        description: "Returns the token in the body *and* as an HTTP-only cookie. Strictest limiter of the API (login bucket).",
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } },
        responses: {
          200: ok("Logged in", { user: { $ref: "#/components/schemas/AuthUser" }, accessToken: { type: "string" } }),
          400: validationErrorResponse(),
          401: errorResponse("Invalid credentials"),
          429: { $ref: "#/components/responses/TooManyRequests" },
        },
      },
    },
    "/api/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate the refresh token for a new pair",
        description: "Reads the `elysian_refresh` cookie (scoped to /api/auth) or a `refreshToken` body field. Rotation is single-use.",
        security: [],
        requestBody: { required: false, content: { "application/json": { schema: { type: "object", properties: { refreshToken: { type: "string" } } } } } },
        responses: {
          200: ok("Session refreshed", { user: { $ref: "#/components/schemas/AuthUser" }, accessToken: { type: "string" } }),
          401: errorResponse("Invalid or expired session"),
          429: { $ref: "#/components/responses/TooManyRequests" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Revoke the refresh session and clear cookies",
        security: [],
        responses: { 200: ok("Logged out") },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Current user from the access token or cookie",
        security: secured,
        responses: {
          200: ok("Current user", { user: { $ref: "#/components/schemas/AuthUser" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },

    // ---------------- Users (self-service) ----------------
    "/api/user": {
      get: {
        tags: ["Users"],
        summary: "My profile",
        security: secured,
        responses: {
          200: ok("Profile", { user: { $ref: "#/components/schemas/AuthUser" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      patch: {
        tags: ["Users"],
        summary: "Update my profile",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateProfileRequest" } } } },
        responses: {
          200: ok("Profile updated", { user: { $ref: "#/components/schemas/AuthUser" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/user/password": {
      patch: {
        tags: ["Users"],
        summary: "Change my password",
        description: "Requires the current password. Rate-limited on the sensitive bucket.",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ChangePasswordRequest" } } } },
        responses: {
          200: ok("Password changed"),
          400: validationErrorResponse(),
          401: errorResponse("Current password incorrect"),
          429: { $ref: "#/components/responses/TooManyRequests" },
        },
      },
    },

    // ---------------- Cart ----------------
    "/api/cart": {
      get: {
        tags: ["Cart"],
        summary: "My cart",
        security: secured,
        responses: {
          200: ok("Cart", { $ref: "#/components/schemas/Cart" }),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      delete: {
        tags: ["Cart"],
        summary: "Clear the cart",
        security: secured,
        responses: { 200: ok("Cart cleared"), 401: { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/api/cart/items": {
      post: {
        tags: ["Cart"],
        summary: "Add a game to the cart",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AddCartItemRequest" } } } },
        responses: {
          201: ok("Added to cart", { $ref: "#/components/schemas/Cart" }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/cart/items/{gameId}": {
      delete: {
        tags: ["Cart"],
        summary: "Remove a game from the cart",
        security: secured,
        parameters: [idParam("gameId", "Game id")],
        responses: {
          200: ok("Removed from cart", { $ref: "#/components/schemas/Cart" }),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ---------------- Games (public catalog) ----------------
    "/api/games": {
      get: {
        tags: ["Games"],
        summary: "Search the public catalog",
        description: "Public. Paginated and filterable; every price is integer paisa.",
        security: [],
        parameters: [
          { name: "q", in: "query", description: "Free-text query", schema: { type: "string", maxLength: 200 } },
          { name: "genre", in: "query", description: "Genre slug", schema: { type: "string" } },
          { name: "tag", in: "query", description: "Tag slug", schema: { type: "string" } },
          { name: "priceMin", in: "query", schema: { type: "integer", minimum: 0 } },
          { name: "priceMax", in: "query", schema: { type: "integer", minimum: 0 } },
          { name: "minRating", in: "query", description: "0..1 recommend ratio", schema: { type: "number", minimum: 0, maximum: 1 } },
          { name: "releaseFrom", in: "query", schema: { type: "string", example: "2026-01-01" } },
          { name: "releaseTo", in: "query", schema: { type: "string", example: "2026-12-31" } },
          { name: "sort", in: "query", schema: { type: "string", enum: ["relevance", "newest", "price_asc", "price_desc", "top_rated", "trending"], default: "newest" } },
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 12 } },
        ],
        responses: {
          200: ok("Matching games", { games: { type: "array", items: { $ref: "#/components/schemas/Game" } }, total: { type: "integer" }, page: { type: "integer" }, pageSize: { type: "integer" } }),
          400: validationErrorResponse(),
        },
      },
      post: {
        tags: ["Games"],
        summary: "Create a game (publisher)",
        description: "Starts in `DRAFT`. Requires role PUBLISHER or ADMIN (Action `game:create`); ownership is asserted in the service.",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateGameRequest" } } } },
        responses: {
          201: ok("Game created", { game: { $ref: "#/components/schemas/Game" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/genres": {
      get: {
        tags: ["Games"],
        summary: "All genres",
        security: [],
        responses: { 200: ok("Genres", { genres: { type: "array", items: { $ref: "#/components/schemas/Genre" } } }) },
      },
      post: {
        tags: ["Admin"],
        summary: "Create a genre (admin)",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string", minLength: 2, maxLength: 60 } } } } } },
        responses: {
          201: ok("Genre created", { genre: { $ref: "#/components/schemas/Genre" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/genres/{id}": {
      delete: {
        tags: ["Admin"],
        summary: "Delete a genre (admin)",
        security: secured,
        parameters: [{ $ref: "#/components/parameters/IdPath" }],
        responses: {
          200: ok("Genre deleted"),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/games/tags": {
      get: {
        tags: ["Games"],
        summary: "All tags",
        security: [],
        responses: { 200: ok("Tags", { tags: { type: "array", items: { $ref: "#/components/schemas/Tag" } } }) },
      },
      post: {
        tags: ["Admin"],
        summary: "Create a tag (admin)",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string", minLength: 2, maxLength: 60 } } } } } },
        responses: {
          201: ok("Tag created", { tag: { $ref: "#/components/schemas/Tag" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/tags/{id}": {
      delete: {
        tags: ["Admin"],
        summary: "Delete a tag (admin)",
        security: secured,
        parameters: [{ $ref: "#/components/parameters/IdPath" }],
        responses: {
          200: ok("Tag deleted"),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/games/mine": {
      get: {
        tags: ["Games"],
        summary: "My games (publisher)",
        description: "Every game owned by the caller's publisher, any status.",
        security: secured,
        parameters: [
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/GameStatus" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 12, maximum: 50 } },
        ],
        responses: {
          200: ok("Publisher games", { games: { type: "array", items: { $ref: "#/components/schemas/Game" } }, total: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: errorResponse("No publisher account for this user"),
        },
      },
    },
    "/api/games/{slug}": {
      get: {
        tags: ["Games"],
        summary: "Game detail by slug",
        description: "Public; pass a token (optional auth) to get personalised flags (owned / wishlisted).",
        security: [],
        parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: ok("Game detail", { game: { $ref: "#/components/schemas/Game" } }),
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Games"],
        summary: "Update game details (owner)",
        security: secured,
        parameters: [idParam("id", "Game id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateGameRequest" } } } },
        responses: {
          200: ok("Game updated", { game: { $ref: "#/components/schemas/Game" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Games"],
        summary: "Delete a draft game (owner)",
        security: secured,
        parameters: [idParam("id", "Game id")],
        responses: {
          200: ok("Game deleted"),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/{id}/submit": {
      post: {
        tags: ["Games"],
        summary: "Submit a game for review (owner)",
        description: "Moves DRAFT → IN_REVIEW; publishability (active build, cover, 3 screenshots, MIN+REC requirements) is checked here.",
        security: secured,
        parameters: [idParam("id", "Game id")],
        responses: {
          200: ok("Submitted for review", { game: { $ref: "#/components/schemas/Game" } }),
          400: errorResponse("Publishability requirements not met"),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/{id}/withdraw": {
      post: {
        tags: ["Games"],
        summary: "Withdraw a game from review (owner)",
        security: secured,
        parameters: [idParam("id", "Game id")],
        responses: {
          200: ok("Withdrawn from review", { game: { $ref: "#/components/schemas/Game" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/{id}/requirements": {
      get: {
        tags: ["Games"],
        summary: "System requirements (public)",
        security: [],
        parameters: [idParam("id", "Game id")],
        responses: {
          200: ok("Requirements", { requirements: { type: "object", properties: { min: { $ref: "#/components/schemas/RequirementRow" }, rec: { $ref: "#/components/schemas/RequirementRow" } } } }),
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      put: {
        tags: ["Games"],
        summary: "Save system requirements (owner)",
        security: secured,
        parameters: [idParam("id", "Game id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RequirementsRequest" } } } },
        responses: {
          200: ok("Requirements saved", { requirements: { type: "object" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/{id}/taxonomy": {
      patch: {
        tags: ["Games"],
        summary: "Set genres and tags (owner)",
        security: secured,
        parameters: [idParam("id", "Game id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TaxonomyRequest" } } } },
        responses: {
          200: ok("Taxonomy updated"),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/{id}/builds": {
      get: {
        tags: ["Games"],
        summary: "List builds (owner)",
        security: secured,
        parameters: [idParam("id", "Game id")],
        responses: {
          200: ok("Builds", { builds: { type: "array", items: { $ref: "#/components/schemas/GameBuild" } } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Games"],
        summary: "Add a build (owner)",
        description: "One active build per (game, platform) is enforced by a partial unique index.",
        security: secured,
        parameters: [idParam("id", "Game id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/BuildRequest" } } } },
        responses: {
          201: ok("Build added", { build: { $ref: "#/components/schemas/GameBuild" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/{id}/builds/{buildId}/activate": {
      post: {
        tags: ["Games"],
        summary: "Activate a build (owner)",
        security: secured,
        parameters: [idParam("id", "Game id"), idParam("buildId", "Build id")],
        responses: {
          200: ok("Build activated", { build: { $ref: "#/components/schemas/GameBuild" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/{id}/builds/{buildId}": {
      delete: {
        tags: ["Games"],
        summary: "Delete a build (owner)",
        security: secured,
        parameters: [idParam("id", "Game id"), idParam("buildId", "Build id")],
        responses: {
          200: ok("Build deleted"),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/{id}/media": {
      post: {
        tags: ["Games"],
        summary: "Add media (owner)",
        description: "Exactly one COVER per game (partial unique index).",
        security: secured,
        parameters: [idParam("id", "Game id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MediaRequest" } } } },
        responses: {
          201: ok("Media added"),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/{id}/media/{mediaId}": {
      delete: {
        tags: ["Games"],
        summary: "Delete media (owner)",
        security: secured,
        parameters: [idParam("id", "Game id"), idParam("mediaId", "Media id")],
        responses: {
          200: ok("Media deleted"),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/{id}/media/{mediaId}/reorder": {
      patch: {
        tags: ["Games"],
        summary: "Reorder one media row (owner)",
        security: secured,
        parameters: [idParam("id", "Game id"), idParam("mediaId", "Media id")],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["sortOrder"], properties: { sortOrder: { type: "integer", minimum: 0, maximum: 1000 } } } } } },
        responses: {
          200: ok("Media reordered"),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },

    // ---------------- Admin: moderation ----------------
    "/api/games/{id}/approve": {
      post: {
        tags: ["Admin"],
        summary: "Approve + publish a game",
        description: "DRAFT/IN_REVIEW → PUBLISHED. Re-validates publishability server-side.",
        security: secured,
        parameters: [idParam("id", "Game id")],
        responses: {
          200: ok("Game approved and published", { game: { $ref: "#/components/schemas/Game" } }),
          400: errorResponse("Publishability requirements not met"),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/{id}/reject": {
      post: {
        tags: ["Admin"],
        summary: "Reject a game in review",
        security: secured,
        parameters: [idParam("id", "Game id")],
        responses: {
          200: ok("Game rejected", { game: { $ref: "#/components/schemas/Game" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/{id}/delist": {
      post: {
        tags: ["Admin"],
        summary: "Delist a published game",
        security: secured,
        parameters: [idParam("id", "Game id")],
        responses: {
          200: ok("Game delisted", { game: { $ref: "#/components/schemas/Game" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/{id}/relist": {
      post: {
        tags: ["Admin"],
        summary: "Re-list a delisted game",
        security: secured,
        parameters: [idParam("id", "Game id")],
        responses: {
          200: ok("Game re-listed", { game: { $ref: "#/components/schemas/Game" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },

    // ---------------- Orders ----------------
    "/api/orders/quote": {
      post: {
        tags: ["Orders"],
        summary: "Price a would-be order without creating it",
        description: "Runs the full pricing engine (promotions, coupon, tax) in integer paisa — the same numbers checkout would charge.",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/QuoteRequest" } } } },
        responses: {
          200: ok("Quote", { $ref: "#/components/schemas/Quote" }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/orders": {
      post: {
        tags: ["Orders"],
        summary: "Create an order (cart or explicit game ids)",
        description: "Totals are recomputed server-side and snapshotted; a pending order expires after PENDING_ORDER_TTL_HOURS (24h).",
        security: secured,
        requestBody: { required: false, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateOrderRequest" } } } },
        responses: {
          201: ok("Order created", { orderId: { type: "string", format: "uuid" }, quote: { $ref: "#/components/schemas/Quote" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
      get: {
        tags: ["Orders"],
        summary: "My orders",
        security: secured,
        parameters: [
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/OrderStatus" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 12, maximum: 50 } },
        ],
        responses: {
          200: ok("Orders", { orders: { type: "array", items: { $ref: "#/components/schemas/Order" } }, total: { type: "integer" }, page: { type: "integer" }, pageSize: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/orders/{id}": {
      get: {
        tags: ["Orders"],
        summary: "One of my orders (with items)",
        security: secured,
        parameters: [idParam("id", "Order id")],
        responses: {
          200: ok("Order", { order: { $ref: "#/components/schemas/Order" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: errorResponse("Not my order"),
        },
      },
    },
    "/api/orders/{id}/pay": {
      post: {
        tags: ["Orders"],
        summary: "Initiate a payment",
        description: "Returns a gateway URL/payload for the chosen provider. Rate-limited on the sensitive bucket; idempotent via `idempotencyKey` or the `Idempotency-Key` header.",
        security: secured,
        parameters: [idParam("id", "Order id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PayRequest" } } } },
        responses: {
          200: ok("Payment initiated", { payment: { $ref: "#/components/schemas/Payment" }, paymentUrl: { type: "string", nullable: true } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          429: { $ref: "#/components/responses/TooManyRequests" },
        },
      },
    },
    "/api/orders/{id}/cancel": {
      post: {
        tags: ["Orders"],
        summary: "Cancel a pending order",
        security: secured,
        parameters: [idParam("id", "Order id")],
        responses: {
          200: ok("Order cancelled", { order: { $ref: "#/components/schemas/Order" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
          409: errorResponse("Order is not cancellable (already paid)"),
        },
      },
    },
    "/api/orders/{id}/simulate": {
      post: {
        tags: ["Orders"],
        summary: "Simulate the provider callback (dev only)",
        description: "Requires ENABLE_MOCK_PAYMENTS. Pushes a signed payload through the *same* webhook code path, signature included.",
        security: secured,
        parameters: [idParam("id", "Order id")],
        requestBody: { required: false, content: { "application/json": { schema: { $ref: "#/components/schemas/SimulatePaymentRequest" } } } },
        responses: {
          200: ok("Simulation complete", { message: { type: "string" }, orderStatus: { $ref: "#/components/schemas/OrderStatus" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: errorResponse("Mock payments are disabled on this server"),
        },
      },
    },
    "/api/orders/{id}/mock-checkout": {
      get: {
        tags: ["Orders"],
        summary: "Mock hosted-checkout page (dev only)",
        description: "Renders an HTML page whose Pay button POSTs a correctly signed callback to /api/webhooks/{provider}. Disabled unless ENABLE_MOCK_PAYMENTS.",
        security: [],
        parameters: [
          idParam("id", "Order id"),
          { name: "provider", in: "query", schema: { $ref: "#/components/schemas/PaymentProvider" } },
          { name: "amount_paisa", in: "query", schema: { type: "integer" } },
        ],
        responses: {
          200: { description: "HTML checkout page", content: { "text/html": { schema: { type: "string" } } } },
          403: errorResponse("Mock payments are disabled on this server"),
        },
      },
    },

    // ---------------- Payments ----------------
    "/api/payments/providers": {
      get: {
        tags: ["Payments"],
        summary: "Providers the checkout screen may offer",
        security: [],
        responses: { 200: ok("Providers", { providers: { type: "array", items: { $ref: "#/components/schemas/PaymentProvider" } } }) },
      },
    },
    "/api/payments/orders/{orderId}/status": {
      get: {
        tags: ["Payments"],
        summary: "Poll order status and its payment rows",
        description: "Ownership is checked server-side; amounts stay integer paisa.",
        security: secured,
        parameters: [idParam("orderId", "Order id")],
        responses: {
          200: ok("Payment status", {
            orderStatus: { $ref: "#/components/schemas/OrderStatus" },
            paidAt: { type: "string", format: "date-time", nullable: true },
            payments: { type: "array", items: { $ref: "#/components/schemas/Payment" } },
          }),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/webhooks/{provider}": {
      post: {
        tags: ["Payments"],
        summary: "Payment provider callback (HMAC signed)",
        description:
          "Unauthenticated by design: authenticity comes from the `X-Elysian-Signature` header, verified with HMAC-SHA256 over the **raw request body** (captured in app.ts before JSON parsing). Replayed/processed events always return 200 so providers stop retrying.",
        security: [],
        parameters: [{ name: "provider", in: "path", required: true, description: "ESEWA | KHALTI | CONNECTIPS | IMEPAY", schema: { $ref: "#/components/schemas/PaymentProvider" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { order_id: { type: "string", format: "uuid" }, transaction_id: { type: "string" }, status: { type: "string", enum: ["SUCCESS", "FAILURE"] }, amount_paisa: { type: "integer" }, provider: { type: "string" } } } } } },
        responses: {
          200: ok("Callback processed", { message: { type: "string" } }),
          400: errorResponse("Signature missing or invalid"),
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ---------------- Library ----------------
    "/api/library": {
      get: {
        tags: ["Library"],
        summary: "My games",
        security: secured,
        parameters: [
          { name: "includeRevoked", in: "query", schema: { type: "string", enum: ["true", "false"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 12, maximum: 50 } },
        ],
        responses: {
          200: ok("Library", { entries: { type: "array", items: { $ref: "#/components/schemas/LibraryEntry" } }, total: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/library/{gameId}/download": {
      get: {
        tags: ["Library"],
        summary: "Issue a signed download URL",
        description: "Licence checked server-side; the returned CDN URL expires after CDN_SIGN_TTL_SEC seconds (anti-piracy guard).",
        security: secured,
        parameters: [
          idParam("gameId", "Game id"),
          { name: "platform", in: "query", schema: { $ref: "#/components/schemas/Platform", default: "WINDOWS" } },
        ],
        responses: {
          200: ok("Signed download URL issued", { url: { type: "string", format: "uri" }, expiresAt: { type: "string", format: "date-time" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: errorResponse("Not owned / revoked licence"),
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ---------------- Reviews ----------------
    "/api/reviews": {
      get: {
        tags: ["Reviews"],
        summary: "Reviews for a game",
        security: [],
        parameters: [
          { name: "gameId", in: "query", required: true, schema: { type: "string", format: "uuid" } },
          { name: "sort", in: "query", schema: { type: "string", enum: ["recent", "helpful", "positive", "negative"], default: "recent" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 12, maximum: 50 } },
        ],
        responses: {
          200: ok("Reviews", { reviews: { type: "array", items: { $ref: "#/components/schemas/Review" } }, total: { type: "integer" } }),
          400: validationErrorResponse(),
        },
      },
      post: {
        tags: ["Reviews"],
        summary: "Write a review",
        description: "One review per user per game; only verified owners can review (service-enforced).",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateReviewRequest" } } } },
        responses: {
          201: ok("Review published", { review: { $ref: "#/components/schemas/Review" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/reviews/{id}": {
      patch: {
        tags: ["Reviews"],
        summary: "Edit my review",
        security: secured,
        parameters: [idParam("id", "Review id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateReviewRequest" } } } },
        responses: {
          200: ok("Review updated", { review: { $ref: "#/components/schemas/Review" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
      delete: {
        tags: ["Reviews"],
        summary: "Delete my review",
        security: secured,
        parameters: [idParam("id", "Review id")],
        responses: {
          200: ok("Review deleted"),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/reviews/{id}/helpful": {
      post: {
        tags: ["Reviews"],
        summary: "Mark a review helpful",
        security: secured,
        parameters: [idParam("id", "Review id")],
        responses: {
          200: ok("Marked helpful", { review: { $ref: "#/components/schemas/Review" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ---------------- Wishlist ----------------
    "/api/wishlist": {
      get: {
        tags: ["Wishlist"],
        summary: "My wishlist",
        security: secured,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 12, maximum: 50 } },
        ],
        responses: {
          200: ok("Wishlist", { items: { type: "array", items: { type: "object", properties: { gameId: { type: "string", format: "uuid" } } } }, total: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Wishlist"],
        summary: "Add a game to my wishlist",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["gameId"], properties: { gameId: { type: "string", format: "uuid" } } } } } },
        responses: {
          201: ok("Added to wishlist"),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/wishlist/{gameId}": {
      delete: {
        tags: ["Wishlist"],
        summary: "Remove a game from my wishlist",
        security: secured,
        parameters: [idParam("gameId", "Game id")],
        responses: {
          200: ok("Removed from wishlist"),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ---------------- Refunds ----------------
    "/api/refunds": {
      post: {
        tags: ["Refunds"],
        summary: "Request a refund for an order item",
        description: "Eligible requests (purchased within REFUND_WINDOW_DAYS and under REFUND_PLAYTIME_MINUTES) are auto-approved; the rest wait for an admin decision.",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RequestRefundRequest" } } } },
        responses: {
          201: ok("Refund request received", { refund: { type: "object", properties: { id: { type: "string", format: "uuid" }, status: { $ref: "#/components/schemas/RefundStatus" } } } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/refunds/mine": {
      get: {
        tags: ["Refunds"],
        summary: "My refund requests",
        security: secured,
        responses: {
          200: ok("Refunds", { refunds: { type: "array", items: { type: "object" } } }),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/refunds/{orderItemId}/eligibility": {
      get: {
        tags: ["Refunds"],
        summary: "Am I still eligible for this item?",
        description: "Reports the window (days) and playtime (minutes) decision before the user commits to a request.",
        security: secured,
        parameters: [idParam("orderItemId", "Order item id")],
        responses: {
          200: ok("Eligibility", { eligible: { type: "boolean" }, reason: { type: "string", nullable: true }, minutesPlayed: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ---------------- Gifts ----------------
    "/api/gifts/mine": {
      get: {
        tags: ["Gifts"],
        summary: "Gifts I sent or received",
        security: secured,
        responses: {
          200: ok("Gifts", { gifts: { type: "array", items: { $ref: "#/components/schemas/Gift" } } }),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/gifts/redeem": {
      post: {
        tags: ["Gifts"],
        summary: "Redeem a gift token",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RedeemGiftRequest" } } } },
        responses: {
          200: ok("Gift redeemed", { gift: { $ref: "#/components/schemas/Gift" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          409: errorResponse("Already redeemed / expired / not for me"),
        },
      },
    },
    "/api/gifts/{token}": {
      get: {
        tags: ["Gifts"],
        summary: "Preview a gift link (public)",
        description: "The recipient may not have an account yet, so this one is unauthenticated.",
        security: [],
        parameters: [{ name: "token", in: "path", required: true, schema: { type: "string", minLength: 16 } }],
        responses: {
          200: ok("Gift", { gift: { $ref: "#/components/schemas/Gift" } }),
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ---------------- Keys ----------------
    "/api/keys/redeem": {
      post: {
        tags: ["Keys"],
        summary: "Redeem a game key",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RedeemKeyRequest" } } } },
        responses: {
          200: ok("Key redeemed", { entry: { type: "object" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: errorResponse("Unknown key"),
          409: errorResponse("Key already redeemed"),
        },
      },
    },
    "/api/games/{id}/keys": {
      get: {
        tags: ["Keys"],
        summary: "List a game's keys (publisher/admin)",
        description: "Statuses only — keys are stored as SHA-256 hashes, so there is deliberately no reveal-by-id route.",
        security: secured,
        parameters: [
          idParam("id", "Game id"),
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/GameKeyStatus" } },
        ],
        responses: {
          200: ok("Keys", { keys: { type: "array", items: { $ref: "#/components/schemas/GameKey" } } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      post: {
        tags: ["Keys"],
        summary: "Generate keys for a game (publisher/admin)",
        description: "Plaintext codes appear only in this response.",
        security: secured,
        parameters: [idParam("id", "Game id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/GenerateKeysRequest" } } } },
        responses: {
          201: ok("Keys generated", { keys: { type: "array", items: { type: "object", properties: { code: { type: "string" } } } } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/games/{id}/keys/summary": {
      get: {
        tags: ["Keys"],
        summary: "Key counts by status (publisher/admin)",
        security: secured,
        parameters: [idParam("id", "Game id")],
        responses: {
          200: ok("Summary", { summary: { type: "object", properties: { available: { type: "integer" }, reserved: { type: "integer" }, redeemed: { type: "integer" } } } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },

    // ---------------- Promotions ----------------
    "/api/promotions/active": {
      get: {
        tags: ["Promotions"],
        summary: "Promotions currently on sale (public)",
        security: [],
        responses: { 200: ok("Active promotions", { promotions: { type: "array", items: { $ref: "#/components/schemas/Promotion" } } }) },
      },
    },
    "/api/promotions": {
      get: {
        tags: ["Promotions"],
        summary: "Promotions I manage (publisher) or all (admin)",
        security: secured,
        responses: {
          200: ok("Promotions", { promotions: { type: "array", items: { $ref: "#/components/schemas/Promotion" } } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Promotions"],
        summary: "Create a promotion",
        description: "Publishers may only create PUBLISHER-funded promotions; admins may create STORE-funded ones too.",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreatePromotionRequest" } } } },
        responses: {
          201: ok("Promotion created", { promotion: { $ref: "#/components/schemas/Promotion" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/promotions/{id}": {
      patch: {
        tags: ["Promotions"],
        summary: "Update a promotion (creator or admin)",
        security: secured,
        parameters: [idParam("id", "Promotion id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdatePromotionRequest" } } } },
        responses: {
          200: ok("Promotion updated", { promotion: { $ref: "#/components/schemas/Promotion" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      delete: {
        tags: ["Promotions"],
        summary: "Delete a promotion (creator or admin)",
        security: secured,
        parameters: [idParam("id", "Promotion id")],
        responses: {
          200: ok("Promotion deleted"),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/promotions/{id}/games": {
      post: {
        tags: ["Promotions"],
        summary: "Attach a game to a promotion",
        security: secured,
        parameters: [idParam("id", "Promotion id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AttachPromotionGameRequest" } } } },
        responses: {
          200: ok("Game added to promotion", { games: { type: "array", items: { type: "object" } } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/promotions/{id}/games/{gameId}": {
      delete: {
        tags: ["Promotions"],
        summary: "Detach a game from a promotion",
        security: secured,
        parameters: [idParam("id", "Promotion id"), idParam("gameId", "Game id")],
        responses: {
          200: ok("Game removed from promotion", { games: { type: "array", items: { type: "object" } } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/promotions/sweep": {
      post: {
        tags: ["Promotions", "Admin"],
        summary: "Run the wishlist → sale fan-out now (admin)",
        description: "The same sweep the in-process scheduler runs automatically; safe to trigger repeatedly (idempotent).",
        security: secured,
        responses: {
          200: ok("Promotion fan-out sweep complete", { processed: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },

    // ---------------- Coupons ----------------
    "/api/coupons/preview": {
      post: {
        tags: ["Coupons"],
        summary: "Preview a coupon against a set of games",
        description: "Re-runs the server-side quote with the code applied — the exact paisa figures checkout would charge. Optional auth personalises the quote (owned games are free).",
        security: [],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PreviewCouponRequest" } } } },
        responses: {
          200: ok("Coupon preview", { valid: { type: "boolean" }, couponDiscountPaisa: { type: "integer" }, quote: { $ref: "#/components/schemas/Quote" } }),
          400: errorResponse("Coupon not applicable / expired / limit reached"),
        },
      },
    },
    "/api/coupons": {
      get: {
        tags: ["Coupons"],
        summary: "All coupons (admin)",
        security: secured,
        responses: {
          200: ok("Coupons", { coupons: { type: "array", items: { $ref: "#/components/schemas/Coupon" } } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Coupons"],
        summary: "Create a coupon (admin)",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateCouponRequest" } } } },
        responses: {
          201: ok("Coupon created", { coupon: { $ref: "#/components/schemas/Coupon" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          409: { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/coupons/{id}": {
      patch: {
        tags: ["Coupons"],
        summary: "Update a coupon (admin)",
        security: secured,
        parameters: [idParam("id", "Coupon id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateCouponRequest" } } } },
        responses: {
          200: ok("Coupon updated", { coupon: { $ref: "#/components/schemas/Coupon" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
      delete: {
        tags: ["Coupons"],
        summary: "Delete a coupon (admin)",
        security: secured,
        parameters: [idParam("id", "Coupon id")],
        responses: {
          200: ok("Coupon deleted"),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },

    // ---------------- Publisher ----------------
    "/api/publisher/apply": {
      post: {
        tags: ["Publisher"],
        summary: "Apply for a publisher account",
        description: "Any authenticated user; a successful application promotes role CUSTOMER → PUBLISHER (status starts UNVERIFIED).",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ApplyPublisherRequest" } } } },
        responses: {
          201: ok("Publisher application received", { publisher: { $ref: "#/components/schemas/Publisher" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          409: errorResponse("A publisher account already exists"),
        },
      },
    },
    "/api/publisher/me": {
      get: {
        tags: ["Publisher"],
        summary: "My publisher profile",
        security: secured,
        responses: {
          200: ok("Publisher", { publisher: { $ref: "#/components/schemas/Publisher" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
      patch: {
        tags: ["Publisher"],
        summary: "Update my publisher profile",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UpdatePublisherRequest" } } } },
        responses: {
          200: ok("Publisher profile updated", { publisher: { $ref: "#/components/schemas/Publisher" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ---------------- Payouts ----------------
    "/api/publisher/payouts/preview": {
      post: {
        tags: ["Payouts"],
        summary: "Preview my payout for a period",
        description: "No rows are written — gross, cut and net are computed in integer paisa.",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PayoutPeriodRequest" } } } },
        responses: {
          200: ok("Payout preview", { grossPaisa: { type: "integer" }, netPaisa: { type: "integer" }, currency: { type: "string" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/publisher/payouts/generate": {
      post: {
        tags: ["Payouts"],
        summary: "Generate my payout for a period",
        description: "Creates a PENDING payout held for PAYOUT_HOLD_DAYS (30) before an admin can release it.",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PayoutPeriodRequest" } } } },
        responses: {
          201: ok("Payout generated", { payout: { $ref: "#/components/schemas/Payout" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          409: errorResponse("Payout already exists for that period"),
        },
      },
    },
    "/api/publisher/payouts": {
      get: {
        tags: ["Payouts"],
        summary: "My payouts",
        security: secured,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 12, maximum: 50 } },
        ],
        responses: {
          200: ok("Payouts", { payouts: { type: "array", items: { $ref: "#/components/schemas/Payout" } }, total: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/admin/payouts": {
      get: {
        tags: ["Payouts", "Admin"],
        summary: "All payouts (admin)",
        security: secured,
        parameters: [
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/PayoutStatus" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 12, maximum: 50 } },
        ],
        responses: {
          200: ok("Payouts", { payouts: { type: "array", items: { $ref: "#/components/schemas/Payout" } }, total: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/admin/payouts/{id}/status": {
      patch: {
        tags: ["Payouts", "Admin"],
        summary: "Release or cancel a payout (admin)",
        description: "PENDING → PAID only once the hold period has elapsed.",
        security: secured,
        parameters: [idParam("id", "Payout id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PayoutStatusRequest" } } } },
        responses: {
          200: ok("Payout updated", { payout: { $ref: "#/components/schemas/Payout" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          409: errorResponse("Hold period not elapsed / already paid"),
        },
      },
    },

    // ---------------- Play sessions ----------------
    "/api/play-sessions": {
      post: {
        tags: ["Play Sessions"],
        summary: "Start a play session",
        description: "Requires the licence (service-enforced). Feeds refund eligibility and review playtime snapshots.",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StartSessionRequest" } } } },
        responses: {
          201: ok("Session started", { session: { type: "object", properties: { id: { type: "string", format: "uuid" }, startedAt: { type: "string", format: "date-time" } } } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: errorResponse("No licence for this game"),
        },
      },
    },
    "/api/play-sessions/{id}/stop": {
      post: {
        tags: ["Play Sessions"],
        summary: "Stop a session",
        description: "Closes the row and reports whole minutes played (integer, never float).",
        security: secured,
        parameters: [idParam("id", "Session id")],
        responses: {
          200: ok("Session stopped", { minutesPlayed: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/play-sessions/playtime/{gameId}": {
      get: {
        tags: ["Play Sessions"],
        summary: "Total playtime for a game (minutes)",
        security: secured,
        parameters: [idParam("gameId", "Game id")],
        responses: {
          200: ok("Playtime", { minutesPlayed: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },

    // ---------------- Notifications ----------------
    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "My notifications",
        security: secured,
        parameters: [
          { name: "unreadOnly", in: "query", schema: { type: "string", enum: ["true", "false"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 12, maximum: 50 } },
        ],
        responses: {
          200: ok("Notifications", { notifications: { type: "array", items: { $ref: "#/components/schemas/Notification" } }, total: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/notifications/unread-count": {
      get: {
        tags: ["Notifications"],
        summary: "Unread badge count",
        security: secured,
        responses: {
          200: ok("Unread count", { unread: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark everything read",
        security: secured,
        responses: {
          200: ok("All notifications marked as read", { updated: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark one notification read",
        security: secured,
        parameters: [idParam("id", "Notification id")],
        responses: {
          200: ok("Notification marked as read"),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ---------------- Dashboard ----------------
    "/api/dashboard/admin": {
      get: {
        tags: ["Dashboard", "Admin"],
        summary: "Store-wide aggregates (admin)",
        security: secured,
        responses: {
          200: ok("Admin dashboard", { type: "object", additionalProperties: true }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/dashboard/publisher": {
      get: {
        tags: ["Dashboard"],
        summary: "My publisher aggregates",
        security: secured,
        responses: {
          200: ok("Publisher dashboard", { type: "object", additionalProperties: true }),
          401: { $ref: "#/components/responses/Unauthorized" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/dashboard/wishlist-conversion": {
      get: {
        tags: ["Dashboard", "Admin"],
        summary: "Wishlist → sale conversion stats (admin)",
        description: "Optionally scoped to one promotion with `?promotionId=`.",
        security: secured,
        parameters: [{ name: "promotionId", in: "query", schema: { type: "string", format: "uuid" } }],
        responses: {
          200: ok("Conversion stats", { type: "object", additionalProperties: true }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },

    // ---------------- Admin ----------------
    "/api/admin/publishers": {
      get: {
        tags: ["Admin"],
        summary: "All publisher applications (admin)",
        security: secured,
        parameters: [
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/PublisherStatus" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 12, maximum: 50 } },
        ],
        responses: {
          200: ok("Publishers", { publishers: { type: "array", items: { $ref: "#/components/schemas/Publisher" } }, total: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/admin/publishers/{id}/status": {
      patch: {
        tags: ["Admin"],
        summary: "Approve / suspend a publisher (admin)",
        description: "Only VERIFIED publishers can have games published.",
        security: secured,
        parameters: [idParam("id", "Publisher id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/PublisherStatusRequest" } } } },
        responses: {
          200: ok("Publisher status updated", { publisher: { $ref: "#/components/schemas/Publisher" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },
    "/api/admin/maintenance/sweeps": {
      post: {
        tags: ["Admin"],
        summary: "Run the maintenance sweeps now (admin)",
        description: "Promotion fan-out, expired orders/gifts, stale key reservations, stale sessions — all idempotent.",
        security: secured,
        responses: {
          200: ok("Maintenance sweeps complete", {
            promotionsNotified: { type: "integer" },
            ordersExpired: { type: "integer" },
            giftsExpired: { type: "integer" },
            keysReleased: { type: "integer" },
            sessionsClosed: { type: "integer" },
            sessionsDeleted: { type: "integer" },
          }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/admin/audit-logs": {
      get: {
        tags: ["Admin"],
        summary: "Append-only audit trail (admin)",
        security: secured,
        parameters: [
          { name: "actorId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "entity", in: "query", schema: { type: "string", example: "game" } },
          { name: "entityId", in: "query", schema: { type: "string" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 12, maximum: 50 } },
        ],
        responses: {
          200: ok("Audit logs", { logs: { type: "array", items: { type: "object", additionalProperties: true } }, total: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },

    // ---------------- Admin: user management ----------------
    "/api/admin/users": {
      get: {
        tags: ["Admin"],
        summary: "Paginated user list (admin)",
        security: secured,
        parameters: [
          { name: "role", in: "query", schema: { $ref: "#/components/schemas/Role" } },
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/UserStatus" } },
          { name: "search", in: "query", description: "Case-insensitive match on email or username", schema: { type: "string", maxLength: 100 } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 12, maximum: 50 } },
        ],
        responses: {
          200: ok("Users", { users: { type: "array", items: { $ref: "#/components/schemas/AdminUser" } }, total: { type: "integer" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/admin/users/{id}": {
      patch: {
        tags: ["Admin"],
        summary: "Update a user's role and/or status (admin)",
        description: "Role and status changes are written to the audit trail. Admins cannot change their own role or status.",
        security: secured,
        parameters: [idParam("id", "User id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdminUserUpdateRequest" } } } },
        responses: {
          200: ok("User updated", { user: { $ref: "#/components/schemas/AdminUser" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ---------------- Admin: refund decisions ----------------
    "/api/admin/refunds": {
      get: {
        tags: ["Admin"],
        summary: "List refund requests (admin)",
        security: secured,
        parameters: [
          { name: "status", in: "query", schema: { $ref: "#/components/schemas/RefundStatus" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", default: 12, maximum: 50 } },
        ],
        responses: {
          200: ok("Refunds", { refunds: { type: "array", items: { type: "object", additionalProperties: true } }, total: { type: "integer" } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/admin/refunds/{id}/decide": {
      patch: {
        tags: ["Admin"],
        summary: "Approve / reject a pending refund (admin)",
        description: "Only PENDING requests can be decided. APPROVE runs the same execution flow as an auto-approved refund: provider refund, entitlement revocation, order status — one transaction, integer paisa.",
        security: secured,
        parameters: [idParam("id", "Refund id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/DecideRefundRequest" } } } },
        responses: {
          200: ok("Decision recorded", { type: "object", additionalProperties: true }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ---------------- Admin: review moderation ----------------
    "/api/admin/reviews/{id}/moderate": {
      patch: {
        tags: ["Admin"],
        summary: "Hide or restore a review (admin)",
        description: "Moves the review to the given moderation status (REJECTED = hidden). Hidden reviews disappear from the public listing, which only ever returns APPROVED rows.",
        security: secured,
        parameters: [idParam("id", "Review id")],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ModerateReviewRequest" } } } },
        responses: {
          200: ok("Review moderation updated", { review: { $ref: "#/components/schemas/Review" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
          404: { $ref: "#/components/responses/NotFound" },
        },
      },
    },

    // ---------------- Admin: tax config ----------------
    "/api/admin/tax-config": {
      get: {
        tags: ["Admin"],
        summary: "View the VAT configuration (admin)",
        description: "Returns the currently effective row plus the full effective-dated history.",
        security: secured,
        responses: {
          200: ok("Tax config", { current: { $ref: "#/components/schemas/TaxConfig" }, configs: { type: "array", items: { $ref: "#/components/schemas/TaxConfig" } } }),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Admin"],
        summary: "Set the VAT rate (admin)",
        description: "Appends a new effective-dated row (history is never rewritten); the latest effective_from (<= now) wins on the next quote. PUT is an alias with identical semantics.",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TaxConfigRequest" } } } },
        responses: {
          201: ok("Tax config saved", { taxConfig: { $ref: "#/components/schemas/TaxConfig" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
      put: {
        tags: ["Admin"],
        summary: "Set the VAT rate (admin, alias of POST)",
        security: secured,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/TaxConfigRequest" } } } },
        responses: {
          201: ok("Tax config saved", { taxConfig: { $ref: "#/components/schemas/TaxConfig" } }),
          400: validationErrorResponse(),
          401: { $ref: "#/components/responses/Unauthorized" },
          403: { $ref: "#/components/responses/Forbidden" },
        },
      },
    },
  },
};

export { swaggerSpec, swaggerUi };
