import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { PAYOUT_CURRENCIES } from "../enums/payoutCurrencyEnum";
import { PAYOUT_STATUSES, PayoutStatus } from "../enums/payoutStatusEnum";
import { IPayout, IPayoutCreation } from "../interfaces/payoutInterface";

// One row per publisher per period (unique composite). PENDING rows may be
// regenerated while the hold period runs; PAID rows are frozen.
class Payout extends Model<IPayout, IPayoutCreation> implements IPayout {
    declare id: string;
    declare publisherId: string;
    declare periodStart: Date;
    declare periodEnd: Date;
    declare grossPaisa: number;
    declare refundsPaisa: number;
    declare commissionPaisa: number;
    declare netPaisa: number;
    declare payoutCurrency: IPayout["payoutCurrency"];
    declare fxRateSnapshot: number | null;
    declare status: PayoutStatus;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        Payout.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                publisherId: { type: DataTypes.UUID, allowNull: false },
                periodStart: { type: DataTypes.DATE, allowNull: false },
                periodEnd: { type: DataTypes.DATE, allowNull: false },
                grossPaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                refundsPaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                commissionPaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                netPaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                payoutCurrency: {
                    type: DataTypes.ENUM(...PAYOUT_CURRENCIES),
                    allowNull: false,
                    defaultValue: "NPR",
                },
                fxRateSnapshot: { type: DataTypes.FLOAT, allowNull: true },
                status: {
                    type: DataTypes.ENUM(...PAYOUT_STATUSES),
                    allowNull: false,
                    defaultValue: PayoutStatus.PENDING,
                },
            } as unknown as ModelAttributes<Payout, IPayout>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "payouts",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default Payout;
