import { Transaction } from "sequelize";

import GameBuild from "../models/gameBuildModel";
import { IGameBuild, IGameBuildCreation } from "../interfaces/gameBuildInterface";

class GameBuildRepository {
    static async create(data: IGameBuildCreation, transaction?: Transaction): Promise<GameBuild> {
        return GameBuild.create(data, { transaction });
    }

    static async findById(id: string): Promise<GameBuild | null> {
        return GameBuild.findByPk(id);
    }

    static async listByGame(gameId: string): Promise<GameBuild[]> {
        return GameBuild.findAll({
            where: { gameId },
            order: [["created_at", "DESC"]],
        });
    }

    static async findActiveByGameAndPlatform(
        gameId: string,
        platform: string,
    ): Promise<GameBuild | null> {
        return GameBuild.findOne({ where: { gameId, platform, isActive: true } });
    }

    // Keeps the "one active build per platform" invariant: MUST run BEFORE the
    // new active row is written (insert or update) — the partial unique index
    // game_builds_active_platform_unique (game_id, platform) WHERE is_active
    // rejects a second active row, so deactivating afterwards never gets the
    // chance (and would surface as a constraint error). Any remaining race is
    // backstopped by the same index.
    static async deactivateAll(
        gameId: string,
        platform: string,
        transaction?: Transaction,
    ): Promise<number> {
        const [count] = await GameBuild.update(
            { isActive: false },
            { where: { gameId, platform }, transaction },
        );
        return count;
    }

    static async deleteById(id: string, transaction?: Transaction): Promise<number> {
        return GameBuild.destroy({ where: { id }, transaction });
    }
}

export default GameBuildRepository;



