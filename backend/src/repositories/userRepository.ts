import { Op, Transaction } from "sequelize";

import { Database } from "../config";
import User from "../models/userModel";
import { IUser, IUserCreation } from "../interfaces/userInterface";

const { sequelize } = Database;

class UserRepository {
    static async findById(id: string): Promise<User | null> {
        return User.findByPk(id);
    }

    static async findByEmail(email: string): Promise<User | null> {
        return User.findOne({ where: { email: email.toLowerCase() } });
    }

    static async findByUsername(username: string): Promise<User | null> {
        return User.findOne({ where: { username: username.toLowerCase() } });
    }

    static async emailExists(email: string): Promise<boolean> {
        const count = await User.count({ where: { email: email.toLowerCase() } });
        return count > 0;
    }

    static async usernameExists(username: string): Promise<boolean> {
        const count = await User.count({ where: { username: username.toLowerCase() } });
        return count > 0;
    }

    static async create(data: IUserCreation, transaction?: Transaction): Promise<User> {
        return User.create(data, { transaction });
    }

    static async updateById(
        id: string,
        fields: Partial<IUser>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return User.update(fields, { where: { id }, transaction });
    }

    static async list(params: {
        role?: string;
        status?: string;
        search?: string;
        limit: number;
        offset: number;
    }): Promise<{ rows: User[]; count: number }> {
        const where: Record<string, unknown> = {};
        if (params.role) where.role = params.role;
        if (params.status) where.status = params.status;
        if (params.search) {
            where[Op.or as never] = [
                { email: { [Op.iLike]: `%${params.search}%` } },
                { username: { [Op.iLike]: `%${params.search}%` } },
            ];
        }
        return User.findAndCountAll({
            where,
            limit: params.limit,
            offset: params.offset,
            order: [["created_at", "DESC"]],
        });
    }
}

export default UserRepository;
