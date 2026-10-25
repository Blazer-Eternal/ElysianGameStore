import { Transaction } from "sequelize";

import Cart from "../models/cartModel";
import { ICartCreation } from "../interfaces/cartInterface";

class CartRepository {
    /**
     * One cart per user (unique user_id). findOrCreate retries once on the
     * unique-violation race, so two parallel requests still end up with a
     * single cart row.
     */
    static async findOrCreateByUser(userId: string, transaction?: Transaction): Promise<Cart> {
        const existing = await Cart.findOne({ where: { userId }, transaction });
        if (existing) return existing;
        try {
            return await Cart.create({ userId } as ICartCreation, { transaction });
        } catch {
            const again = await Cart.findOne({ where: { userId }, transaction });
            if (again) return again;
            throw new Error("Could not create cart");
        }
    }

    static async findById(id: string): Promise<Cart | null> {
        return Cart.findByPk(id);
    }

    static async findByUser(userId: string): Promise<Cart | null> {
        return Cart.findOne({ where: { userId } });
    }
}

export default CartRepository;
