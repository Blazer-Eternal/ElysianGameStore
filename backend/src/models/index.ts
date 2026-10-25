import { Database } from "../config";

import { defineAssociations } from "./associations";
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

const sequelize = Database.sequelize;

// Init order matters only in that associations run after every init.
User.initModel(sequelize);
Session.initModel(sequelize);
Publisher.initModel(sequelize);
TaxConfig.initModel(sequelize);
Genre.initModel(sequelize);
Tag.initModel(sequelize);
Game.initModel(sequelize);
GameBuild.initModel(sequelize);
SystemRequirement.initModel(sequelize);
GameMedia.initModel(sequelize);
Promotion.initModel(sequelize);
PromotionGame.initModel(sequelize);
Coupon.initModel(sequelize);
Cart.initModel(sequelize);
CartItem.initModel(sequelize);
Order.initModel(sequelize);
OrderItem.initModel(sequelize);
Payment.initModel(sequelize);
Refund.initModel(sequelize);
LibraryEntry.initModel(sequelize);
GameKey.initModel(sequelize);
Review.initModel(sequelize);
Wishlist.initModel(sequelize);
PlaySession.initModel(sequelize);
Gift.initModel(sequelize);
Payout.initModel(sequelize);
AuditLog.initModel(sequelize);
Notification.initModel(sequelize);

defineAssociations();

export {
    AuditLog,
    Cart,
    CartItem,
    Coupon,
    Game,
    GameBuild,
    GameKey,
    GameMedia,
    Genre,
    Gift,
    LibraryEntry,
    Notification,
    Order,
    OrderItem,
    Payment,
    Payout,
    PlaySession,
    Promotion,
    PromotionGame,
    Publisher,
    Refund,
    Review,
    Session,
    SystemRequirement,
    Tag,
    TaxConfig,
    User,
    Wishlist,
};
