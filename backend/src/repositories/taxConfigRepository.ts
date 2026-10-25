import { Op, Transaction } from "sequelize";

import TaxConfig from "../models/taxConfigModel";
import { ITaxConfigCreation } from "../interfaces/taxConfigInterface";

class TaxConfigRepository {
    // The latest row by effective_from (<= now) wins — the pricing engine's
    // single source of truth for VAT.
    static async findLatest(now: Date = new Date()): Promise<TaxConfig | null> {
        return TaxConfig.findOne({
            where: { effectiveFrom: { [Op.lte]: now } },
            order: [["effective_from", "DESC"]],
        });
    }

    static async create(data: ITaxConfigCreation, transaction?: Transaction): Promise<TaxConfig> {
        return TaxConfig.create(data, { transaction });
    }

    static async listAll(): Promise<TaxConfig[]> {
        return TaxConfig.findAll({ order: [["effective_from", "DESC"]] });
    }
}

export default TaxConfigRepository;
