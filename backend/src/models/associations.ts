import AuditLog from "./auditLogModel";
import Cart from "./cartModel";
import CartItem from "./cartItemModel";
import Coupon from "./couponModel";
import Game from "./gameModel";
import GameBuild from "./gameBuildModel";
import GameKey from "./gameKeyModel";
import GameMedia from "./gameMediaModel";
import Genre from "./genreModel";
import Gift from "./giftModel";
import LibraryEntry from "./libraryEntryModel";
import Notification from "./notificationModel";
import Order from "./orderModel";
import OrderItem from "./orderItemModel";
import Payment from "./paymentModel";
import Payout from "./payoutModel";
import PlaySession from "./playSessionModel";
import Promotion from "./promotionModel";
import PromotionGame from "./promotionGameModel";
import Publisher from "./publisherModel";
import Refund from "./refundModel";
import Review from "./reviewModel";
import Session from "./sessionModel";
import SystemRequirement from "./systemRequirementModel";
import Tag from "./tagModel";
import TaxConfig from "./taxConfigModel";
import User from "./userModel";
import Wishlist from "./wishlistModel";

// All relationships in one place. Join tables (game_genres, game_tags) are
// referenced by name only — they are pure M:N pivots with no behaviour.
export const defineAssociations = (): void => {
    // ---- Users & auth ----
    User.hasMany(Session, { foreignKey: "userId", as: "sessions", onDelete: "CASCADE" });
    Session.belongsTo(User, { foreignKey: "userId", as: "user" });

    User.hasOne(Cart, { foreignKey: "userId", as: "cart" });
    Cart.belongsTo(User, { foreignKey: "userId", as: "user" });

    User.hasOne(Publisher, { foreignKey: "ownerUserId", as: "publisher" });
    Publisher.belongsTo(User, { foreignKey: "ownerUserId", as: "owner" });

    // ---- Publisher → Game → subresources ----
    Publisher.hasMany(Game, { foreignKey: "publisherId", as: "games" });
    Game.belongsTo(Publisher, { foreignKey: "publisherId", as: "publisher" });

    Publisher.hasMany(Payout, { foreignKey: "publisherId", as: "payouts" });
    Payout.belongsTo(Publisher, { foreignKey: "publisherId", as: "publisher" });

    Game.hasMany(GameBuild, { foreignKey: "gameId", as: "builds", onDelete: "CASCADE" });
    GameBuild.belongsTo(Game, { foreignKey: "gameId", as: "game" });

    Game.hasMany(SystemRequirement, {
        foreignKey: "gameId",
        as: "systemRequirements",
        onDelete: "CASCADE",
    });
    SystemRequirement.belongsTo(Game, { foreignKey: "gameId", as: "game" });

    Game.hasMany(GameMedia, { foreignKey: "gameId", as: "media", onDelete: "CASCADE" });
    GameMedia.belongsTo(Game, { foreignKey: "gameId", as: "game" });

    Game.hasMany(GameKey, { foreignKey: "gameId", as: "keys", onDelete: "CASCADE" });
    GameKey.belongsTo(Game, { foreignKey: "gameId", as: "game" });

    // ---- Taxonomy M:N ----
    Game.belongsToMany(Genre, {
        through: "game_genres",
        foreignKey: "game_id",
        otherKey: "genre_id",
        as: "genres",
    });
    Genre.belongsToMany(Game, {
        through: "game_genres",
        foreignKey: "genre_id",
        otherKey: "game_id",
        as: "games",
    });

    Game.belongsToMany(Tag, {
        through: "game_tags",
        foreignKey: "game_id",
        otherKey: "tag_id",
        as: "tags",
    });
    Tag.belongsToMany(Game, {
        through: "game_tags",
        foreignKey: "tag_id",
        otherKey: "game_id",
        as: "games",
    });

    // ---- Promotions ----
    Promotion.hasMany(PromotionGame, {
        foreignKey: "promotionId",
        as: "promotionGames",
        onDelete: "CASCADE",
    });
    PromotionGame.belongsTo(Promotion, { foreignKey: "promotionId", as: "promotion" });
    PromotionGame.belongsTo(Game, { foreignKey: "gameId", as: "game" });

    // ---- Cart ----
    Cart.hasMany(CartItem, { foreignKey: "cartId", as: "items", onDelete: "CASCADE" });
    CartItem.belongsTo(Cart, { foreignKey: "cartId", as: "cart" });
    CartItem.belongsTo(Game, { foreignKey: "gameId", as: "game" });

    // ---- Orders, items, payments, refunds ----
    User.hasMany(Order, { foreignKey: "userId", as: "orders" });
    Order.belongsTo(User, { foreignKey: "userId", as: "user" });
    Order.belongsTo(Coupon, { foreignKey: "couponId", as: "coupon" });

    Order.hasMany(OrderItem, { foreignKey: "orderId", as: "items", onDelete: "CASCADE" });
    OrderItem.belongsTo(Order, { foreignKey: "orderId", as: "order" });
    OrderItem.belongsTo(Game, { foreignKey: "gameId", as: "game" });
    OrderItem.belongsTo(Publisher, { foreignKey: "publisherId", as: "publisher" });

    Order.hasMany(Payment, { foreignKey: "orderId", as: "payments", onDelete: "CASCADE" });
    Payment.belongsTo(Order, { foreignKey: "orderId", as: "order" });

    OrderItem.hasOne(Refund, { foreignKey: "orderItemId", as: "refund" });
    Refund.belongsTo(OrderItem, { foreignKey: "orderItemId", as: "orderItem" });
    Refund.belongsTo(User, { foreignKey: "decidedBy", as: "decider" });

    // ---- Library ----
    User.hasMany(LibraryEntry, { foreignKey: "userId", as: "libraryEntries" });
    LibraryEntry.belongsTo(User, { foreignKey: "userId", as: "user" });
    LibraryEntry.belongsTo(Game, { foreignKey: "gameId", as: "game" });
    LibraryEntry.belongsTo(OrderItem, { foreignKey: "orderItemId", as: "orderItem" });

    // ---- Reviews, wishlist, play sessions ----
    User.hasMany(Review, { foreignKey: "userId", as: "reviews" });
    Review.belongsTo(User, { foreignKey: "userId", as: "user" });
    Review.belongsTo(Game, { foreignKey: "gameId", as: "game" });

    User.hasMany(Wishlist, { foreignKey: "userId", as: "wishlist" });
    Wishlist.belongsTo(User, { foreignKey: "userId", as: "user" });
    Wishlist.belongsTo(Game, { foreignKey: "gameId", as: "game" });

    User.hasMany(PlaySession, { foreignKey: "userId", as: "playSessions" });
    PlaySession.belongsTo(User, { foreignKey: "userId", as: "user" });
    PlaySession.belongsTo(Game, { foreignKey: "gameId", as: "game" });

    // ---- Gifts & keys ----
    User.hasMany(Gift, { foreignKey: "senderId", as: "sentGifts" });
    Gift.belongsTo(User, { foreignKey: "senderId", as: "sender" });
    Gift.belongsTo(User, { foreignKey: "redeemedBy", as: "redeemer" });
    Gift.belongsTo(Game, { foreignKey: "gameId", as: "game" });

    GameKey.belongsTo(User, { foreignKey: "reservedBy", as: "reservedByUser" });
    GameKey.belongsTo(User, { foreignKey: "redeemedBy", as: "redeemedByUser" });

    // ---- Notifications & audit ----
    User.hasMany(Notification, { foreignKey: "userId", as: "notifications" });
    Notification.belongsTo(User, { foreignKey: "userId", as: "user" });

    User.hasMany(AuditLog, { foreignKey: "actorId", as: "auditLogs" });
    AuditLog.belongsTo(User, { foreignKey: "actorId", as: "actor" });

    // TaxConfig is standalone (effective-dated rows, latest wins).
    void TaxConfig;
};
