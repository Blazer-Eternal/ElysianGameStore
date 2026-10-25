import { Op, Transaction } from "sequelize";

import Promotion from "../models/promotionModel";
import { IPromotion, IPromotionCreation } from "../interfaces/promotionInterface";

class PromotionRepository {
    static async create(data: IPromotionCreation, transaction?: Transaction): Promise<Promotion> {
        return Promotion.create(data, { transaction });
    }

    static async findById(id: string): Promise<Promotion | null> {
        return Promotion.findByPk(id);
    }

    static async updateById(
        id: string,
        fields: Partial<IPromotion>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return Promotion.update(fields, { where: { id }, transaction });
    }

    static async deleteById(id: string, transaction?: Transaction): Promise<number> {
        return Promotion.destroy({ where: { id }, transaction });
    }

    static async listAll(params?: { limit?: number; offset?: number }): Promise<Promotion[]> {
        return Promotion.findAll({
            limit: params?.limit,
            offset: params?.offset,
            order: [["starts_at", "DESC"]],
        });
    }

    static async listByCreator(creatorId: string): Promise<Promotion[]> {
        return Promotion.findAll({ where: { createdBy: creatorId }, order: [["starts_at", "DESC"]] });
    }

    // Promotions that are live right now and have not had their wishlist
    // fan-out yet (input for the promotion-start sweep job).
    static async listLiveUnnotified(now: Date = new Date()): Promise<Promotion[]> {
        return Promotion.findAll({
            // MUST use Op symbols: plain string keys ("lte"/"gt") are not
            // operators in Sequelize v6 — they silently degraded the where to
            // `starts_at = now AND ends_at = now`, so the fan-out sweep
            // matched nothing and never notified anyone.
            where: {
                startsAt: { [Op.lte]: now },
                endsAt: { [Op.gt]: now },
                notifiedAt: null,
            },
            order: [["starts_at", "ASC"]],
            limit: 200,
        });
    }
}

export default PromotionRepository;
