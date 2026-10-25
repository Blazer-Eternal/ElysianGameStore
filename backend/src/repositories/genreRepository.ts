import { Transaction } from "sequelize";

import Genre from "../models/genreModel";
import { IGenreCreation } from "../interfaces/genreInterface";

class GenreRepository {
    static async create(data: IGenreCreation, transaction?: Transaction): Promise<Genre> {
        return Genre.create(data, { transaction });
    }

    static async findById(id: string): Promise<Genre | null> {
        return Genre.findByPk(id);
    }

    static async findBySlug(slug: string): Promise<Genre | null> {
        return Genre.findOne({ where: { slug } });
    }

    static async findByIds(ids: string[]): Promise<Genre[]> {
        return Genre.findAll({ where: { id: ids } });
    }

    static async listAll(): Promise<Genre[]> {
        return Genre.findAll({ order: [["name", "ASC"]] });
    }

    static async deleteById(id: string, transaction?: Transaction): Promise<number> {
        return Genre.destroy({ where: { id }, transaction });
    }
}

export default GenreRepository;
