import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { PAYMENT_PROVIDERS } from "../enums/paymentProviderEnum";
import { PAYMENT_STATUSES, PaymentStatus } from "../enums/paymentStatusEnum";
import { IPayment, IPaymentCreation } from "../interfaces/paymentInterface";

// providerTxnId is unique (webhook idempotency key) and idempotencyKey is
// unique per initiate call. Both are nullable: the callback stamps the
// provider transaction id onto the row created at initiate time.
class Payment extends Model<IPayment, IPaymentCreation> implements IPayment {
    declare id: string;
    declare orderId: string;
    declare provider: IPayment["provider"];
    declare providerTxnId: string | null;
    declare idempotencyKey: string | null;
    declare status: PaymentStatus;
    declare amountPaisa: number;
    declare rawResponse: unknown | null;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        Payment.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                orderId: { type: DataTypes.UUID, allowNull: false },
                provider: {
                    type: DataTypes.ENUM(...PAYMENT_PROVIDERS),
                    allowNull: false,
                },
                providerTxnId: { type: DataTypes.STRING(120), allowNull: true, unique: true },
                idempotencyKey: { type: DataTypes.STRING(120), allowNull: true, unique: true },
                status: {
                    type: DataTypes.ENUM(...PAYMENT_STATUSES),
                    allowNull: false,
                    defaultValue: PaymentStatus.INITIATED,
                },
                amountPaisa: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                rawResponse: { type: DataTypes.JSONB, allowNull: true },
            } as unknown as ModelAttributes<Payment, IPayment>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "payments",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default Payment;
