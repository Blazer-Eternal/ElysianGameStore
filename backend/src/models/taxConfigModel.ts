import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { ITaxConfig, ITaxConfigCreation } from "../interfaces/taxConfigInterface";

// VAT lives in the DB: the row with the latest effective_from (<= now) wins.
// 1300 bps = 13%. Never hard-code a rate in the pricing engine.
class TaxConfig extends Model<ITaxConfig, ITaxConfigCreation> implements ITaxConfig {
    declare id: string;
    declare name: string;
    declare rateBps: number;
    declare effectiveFrom: Date;
    declare readonly createdAt: Date;

    static initModel(sequelize: Sequelize): void {
        TaxConfig.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                name: { type: DataTypes.STRING(60), allowNull: false, defaultValue: "VAT" },
                rateBps: { type: DataTypes.INTEGER, allowNull: false },
                effectiveFrom: { type: DataTypes.DATE, allowNull: false },
            } as unknown as ModelAttributes<TaxConfig, ITaxConfig>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "tax_configs",
                timestamps: true,
                updatedAt: false,
                underscored: true,
            },
        );
    }
}

export default TaxConfig;
