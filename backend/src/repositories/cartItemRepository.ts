import { Transaction } from "sequelize";

import { Database } from "../config";
import CartItem from "../models/cartItemModel";
import Game from "../models/gameModel";
import { ICartItemCreation } from "../interfaces/cartItemInterface";

const { sequelize } = Database;

class CartItemRepository {
    static async create(data: ICartItemCreation, transaction?: Transaction): Promise<CartItem> {
        return CartItem.create(data, { transaction });
    }

    static async listByCart(cartId: string): Promise<CartItem[]> {
        return CartItem.findAll({
            where: { cartId },
            include: [{ model: Game, as: "game" }],
            order: [["added_at", "ASC"]],
        });
    }

    static async findByCartAndGame(
        cartId: string,
        gameId: string,
        transaction?: Transaction,
    ): Promise<CartItem | null> {
        return CartItem.findOne({ where: { cartId, gameId }, transaction });
    }

    static async deleteByCartAndGame(
        cartId: string,
        gameId: string,
        transaction?: Transaction,
    ): Promise<number> {
        return CartItem.destroy({ where: { cartId, gameId }, transaction });
    }

    static async deleteById(id: string, transaction?: Transaction): Promise<number> {
        return CartItem.destroy({ where: { id }, transaction });
    }

    static async clearCart(cartId: string, gameIds: string[], transaction?: Transaction): Promise<number> {
        return CartItem.destroy({
            where: { cartId, gameId: gameIds },
            transaction,
        });
    }

    /** Removes purchased games from the buying user's cart (post-payment). */
    static async clearCartByGames(
        userId: string,
        gameIds: string[],
        transaction?: Transaction,
    ): Promise<number> {
        if (gameIds.length === 0) return 0;
        const [, meta] = await sequelize.query(
            `DELETE FROM cart_items ci
             USING carts c
             WHERE ci.cart_id = c.id AND c.user_id = :userId AND ci.game_id = ANY(ARRAY[:gameIds]::uuid[])`,
            { replacements: { userId, gameIds }, transaction },
        );
        return (meta as unknown as { rowCount: number }).rowCount ?? 0;
    }
}

export default CartItemRepository;
