import { Transaction } from "sequelize";

import Publisher from "../models/publisherModel";
import { IPublisher, IPublisherCreation } from "../interfaces/publisherInterface";

class PublisherRepository {
    static async create(data: IPublisherCreation, transaction?: Transaction): Promise<Publisher> {
        return Publisher.create(data, { transaction });
    }

    static async findById(id: string): Promise<Publisher | null> {
        return Publisher.findByPk(id);
    }

    static async findByOwnerUserId(ownerUserId: string): Promise<Publisher | null> {
        return Publisher.findOne({ where: { ownerUserId } });
    }

    static async updateById(
        id: string,
        fields: Partial<IPublisher>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return Publisher.update(fields, { where: { id }, transaction });
    }

    static async list(params: {
        status?: string;
        limit: number;
        offset: number;
    }): Promise<{ rows: Publisher[]; count: number }> {
        const where: Record<string, unknown> = {};
        if (params.status) where.status = params.status;
        return Publisher.findAndCountAll({
            where,
            limit: params.limit,
            offset: params.offset,
            order: [["created_at", "DESC"]],
        });
    }
}

export default PublisherRepository;
