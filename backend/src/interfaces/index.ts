import { IAuditLog } from "./auditLogInterface";
import { IAuthResult, IJwtPayload } from "./authInterface";
import { ICart } from "./cartInterface";
import { ICartItem } from "./cartItemInterface";
import { ICoupon } from "./couponInterface";
import { IGame } from "./gameInterface";
import { IGameBuild } from "./gameBuildInterface";
import { IGameKey } from "./gameKeyInterface";
import { IGameMedia } from "./gameMediaInterface";
import { IGenre } from "./genreInterface";
import { IGift } from "./giftInterface";
import { ILibraryEntry } from "./libraryEntryInterface";
import { INotification } from "./notificationInterface";
import { IOrder } from "./orderInterface";
import { IOrderItem } from "./orderItemInterface";
import { IPayment } from "./paymentInterface";
import { IPlaySession } from "./playSessionInterface";
import { IPayout } from "./payoutInterface";
import { IPromotion } from "./promotionInterface";
import { IPromotionGame } from "./promotionGameInterface";
import { IPublisher } from "./publisherInterface";
import { IRefund } from "./refundInterface";
import { IReview } from "./reviewInterface";
import { ISession } from "./sessionInterface";
import { ISystemRequirement } from "./systemRequirementInterface";
import { ITag } from "./tagInterface";
import { ITaxConfig } from "./taxConfigInterface";
import { IUser, IUserPublic } from "./userInterface";
import { IWishlist } from "./wishlistInterface";

export type {
    IAuditLog,
    IAuthResult,
    ICart,
    ICartItem,
    ICoupon,
    IGame,
    IGameBuild,
    IGameKey,
    IGameMedia,
    IGenre,
    IGift,
    IJwtPayload,
    ILibraryEntry,
    INotification,
    IOrder,
    IOrderItem,
    IPayment,
    IPayout,
    IPlaySession,
    IPromotion,
    IPromotionGame,
    IPublisher,
    IRefund,
    IReview,
    ISession,
    ISystemRequirement,
    ITag,
    ITaxConfig,
    IUser,
    IUserPublic,
    IWishlist,
};

export * from "./customRequestInterface";
