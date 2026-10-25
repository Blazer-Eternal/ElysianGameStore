import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { PayoutCurrency, PAYOUT_CURRENCIES } from "../enums/payoutCurrencyEnum";
import { PublisherStatus, PUBLISHER_STATUSES } from "../enums/publisherStatusEnum";
import { IPublisher, IPublisherCreation } from "../interfaces/publisherInterface";

// revenueSharePct: the publisher's cut (default 70). A publisher must be
// VERIFIED before any of its games can be published.
class Publisher extends Model<IPublisher, IPublisherCreation> implements IPublisher {
    declare id: string;
    declare name: string;
    declare legalName: string;
    declare taxId: string | null;
    declare payoutAccount: string | null;
    declare payoutCurrency: PayoutCurrency;
    declare revenueSharePct: number;
    declare status: PublisherStatus;
    declare ownerUserId: string;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        Publisher.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                name: { type: DataTypes.STRING(120), allowNull: false },
                legalName: { type: DataTypes.STRING(160), allowNull: false },
                taxId: { type: DataTypes.STRING(60), allowNull: true },
                payoutAccount: { type: DataTypes.STRING(120), allowNull: true },
                payoutCurrency: {
                    type: DataTypes.ENUM(...PAYOUT_CURRENCIES),
                    allowNull: false,
                    defaultValue: PayoutCurrency.NPR,
                },
                revenueSharePct: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 70,
                },
                status: {
                    type: DataTypes.ENUM(...PUBLISHER_STATUSES),
                    allowNull: false,
                    defaultValue: PublisherStatus.UNVERIFIED,
                },
                ownerUserId: { type: DataTypes.UUID, allowNull: false },
            } as unknown as ModelAttributes<Publisher, IPublisher>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "publishers",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default Publisher;
