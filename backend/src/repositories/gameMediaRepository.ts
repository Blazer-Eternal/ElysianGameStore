import { Transaction } from "sequelize";

import GameMedia from "../models/gameMediaModel";
import { IGameMedia, IGameMediaCreation } from "../interfaces/gameMediaInterface";

class GameMediaRepository {
    static async create(data: IGameMediaCreation, transaction?: Transaction): Promise<GameMedia> {
        return GameMedia.create(data, { transaction });
    }

    static async findById(id: string): Promise<GameMedia | null> {
        return GameMedia.findByPk(id);
    }

    static async listByGame(gameId: string): Promise<GameMedia[]> {
        return GameMedia.findAll({
            where: { gameId },
            order: [["sort_order", "ASC"]],
        });
    }

    static async findCover(gameId: string): Promise<GameMedia | null> {
        return GameMedia.findOne({ where: { gameId, type: "COVER" } });
    }

    static async countScreenshots(gameId: string): Promise<number> {
        return GameMedia.count({ where: { gameId, type: "SCREENSHOT" } });
    }

    static async updateById(
        id: string,
        fields: Partial<IGameMedia>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return GameMedia.update(fields, { where: { id }, transaction });
    }

    static async deleteById(id: string, transaction?: Transaction): Promise<number> {
        return GameMedia.destroy({ where: { id }, transaction });
    }
}

export default GameMediaRepository;
