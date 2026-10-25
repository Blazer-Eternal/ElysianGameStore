import { Transaction } from "sequelize";

import SystemRequirement from "../models/systemRequirementModel";
import {
    ISystemRequirement,
    ISystemRequirementCreation,
} from "../interfaces/systemRequirementInterface";

class SystemRequirementRepository {
    // One row per (game, type): insert or update in place.
    static async upsert(
        data: ISystemRequirementCreation,
        transaction?: Transaction,
    ): Promise<SystemRequirement> {
        const existing = await SystemRequirement.findOne({
            where: { gameId: data.gameId, type: data.type },
            transaction,
        });
        if (existing) {
            await existing.update(data, { transaction });
            return existing;
        }
        return SystemRequirement.create(data, { transaction });
    }

    static async findByGameAndType(
        gameId: string,
        type: string,
    ): Promise<SystemRequirement | null> {
        return SystemRequirement.findOne({ where: { gameId, type } });
    }

    static async listByGame(gameId: string): Promise<SystemRequirement[]> {
        return SystemRequirement.findAll({ where: { gameId } });
    }

    static async deleteByGame(gameId: string, transaction?: Transaction): Promise<number> {
        return SystemRequirement.destroy({ where: { gameId }, transaction });
    }
}

export default SystemRequirementRepository;
