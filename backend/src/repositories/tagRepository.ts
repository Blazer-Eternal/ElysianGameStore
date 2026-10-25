import { Transaction } from "sequelize";

import Tag from "../models/tagModel";
import { ITagCreation } from "../interfaces/tagInterface";

class TagRepository {
    static async create(data: ITagCreation, transaction?: Transaction): Promise<Tag> {
        return Tag.create(data, { transaction });
    }

    static async findById(id: string): Promise<Tag | null> {
        return Tag.findByPk(id);
    }

    static async findBySlug(slug: string): Promise<Tag | null> {
        return Tag.findOne({ where: { slug } });
    }

    static async findByIds(ids: string[]): Promise<Tag[]> {
        return Tag.findAll({ where: { id: ids } });
    }

    static async listAll(): Promise<Tag[]> {
        return Tag.findAll({ order: [["name", "ASC"]] });
    }

    static async deleteById(id: string, transaction?: Transaction): Promise<number> {
        return Tag.destroy({ where: { id }, transaction });
    }
}

export default TagRepository;
