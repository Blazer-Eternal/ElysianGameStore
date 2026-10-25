import { Op, Transaction } from "sequelize";

import { GiftStatus } from "../enums/giftStatusEnum";
import Gift from "../models/giftModel";
import { IGift, IGiftCreation } from "../interfaces/giftInterface";

class GiftRepository {
    static async create(data: IGiftCreation, transaction?: Transaction): Promise<Gift> {
        return Gift.create(data, { transaction });
    }

    static async findById(id: string): Promise<Gift | null> {
        return Gift.findByPk(id);
    }

    static async findByToken(redeemToken: string): Promise<Gift | null> {
        return Gift.findOne({ where: { redeemToken } });
    }

    static async listBySender(senderId: string): Promise<Gift[]> {
        return Gift.findAll({ where: { senderId }, order: [["created_at", "DESC"]] });
    }

    static async listByRecipientEmail(recipientEmail: string): Promise<Gift[]> {
        return Gift.findAll({
            where: { recipientEmail: recipientEmail.toLowerCase() },
            order: [["created_at", "DESC"]],
        });
    }

    static async updateById(
        id: string,
        fields: Partial<IGift>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return Gift.update(fields, { where: { id }, transaction });
    }

    /** Sweeper: pending gifts past their expiry become EXPIRED. */
    static async expirePending(): Promise<number> {
        const [count] = await Gift.update(
            { status: GiftStatus.EXPIRED },
            // Op.lt — a plain "lt" key silently degrades to `expires_at = now`,
            // which no pending gift ever matches.
            { where: { status: "PENDING", expiresAt: { [Op.lt]: new Date() } } },
        );
        return count;
    }
}

export default GiftRepository;
