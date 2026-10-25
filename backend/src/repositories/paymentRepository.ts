import { Transaction } from "sequelize";

import Payment from "../models/paymentModel";
import { IPayment, IPaymentCreation } from "../interfaces/paymentInterface";

class PaymentRepository {
    static async create(data: IPaymentCreation, transaction?: Transaction): Promise<Payment> {
        return Payment.create(data, { transaction });
    }

    static async findById(id: string): Promise<Payment | null> {
        return Payment.findByPk(id);
    }

    static async findByOrderId(orderId: string): Promise<Payment[]> {
        return Payment.findAll({ where: { orderId }, order: [["created_at", "DESC"]] });
    }

    static async findByIdempotencyKey(key: string): Promise<Payment | null> {
        return Payment.findOne({ where: { idempotencyKey: key } });
    }

    static async findByProviderTxnId(txnId: string): Promise<Payment | null> {
        return Payment.findOne({ where: { providerTxnId: txnId } });
    }

    static async updateById(
        id: string,
        fields: Partial<IPayment>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return Payment.update(fields, { where: { id }, transaction });
    }
}

export default PaymentRepository;
