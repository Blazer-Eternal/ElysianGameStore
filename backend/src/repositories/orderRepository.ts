import { Op, Transaction } from "sequelize";

import { Database } from "../config";
import { MediaType } from "../enums/mediaTypeEnum";
import Game from "../models/gameModel";
import GameMedia from "../models/gameMediaModel";
import Order from "../models/orderModel";
import OrderItem from "../models/orderItemModel";
import Payment from "../models/paymentModel";
import { IOrder, IOrderCreation } from "../interfaces/orderInterface";

const { sequelize } = Database;

// Items ride with their game and the game's COVER artwork, so the storefront
// can render order lines without a second round trip.
const itemWithGame = {
    model: OrderItem,
    as: "items",
    include: [
        {
            model: Game,
            as: "game",
            include: [
                { model: GameMedia, as: "media", where: { type: MediaType.COVER }, required: false },
            ],
        },
    ],
};

class OrderRepository {
    static async create(data: IOrderCreation, transaction?: Transaction): Promise<Order> {
        return Order.create(data, { transaction });
    }

    static async findById(id: string): Promise<Order | null> {
        return Order.findByPk(id);
    }

    static async findByIdWithItems(id: string): Promise<Order | null> {
        return Order.findByPk(id, {
            include: [
                itemWithGame,
                { model: Payment, as: "payments" },
            ],
        });
    }

    static async findByIdWithItemGame(id: string): Promise<Order | null> {
        return Order.findByPk(id, {
            include: [
                {
                    model: OrderItem,
                    as: "items",
                    include: [{ model: Game, as: "game" }],
                },
            ],
        });
    }

    static async listByUser(
        userId: string,
        params: { status?: string; limit: number; offset: number },
    ): Promise<{ rows: Order[]; count: number }> {
        const where: Record<string, unknown> = { userId };
        if (params.status) where.status = params.status;
        return Order.findAndCountAll({
            where,
            include: [itemWithGame],
            limit: params.limit,
            offset: params.offset,
            order: [["created_at", "DESC"]],
            distinct: true,
        });
    }

    static async updateById(
        id: string,
        fields: Partial<IOrder>,
        transaction?: Transaction,
    ): Promise<[number]> {
        return Order.update(fields, { where: { id }, transaction });
    }

    /**
     * Row lock for the payment webhook: serializes concurrent callbacks for
     * the same order so the PAID transition (and license creation) happens
     * exactly once.
     */
    static async lockById(id: string, transaction: Transaction): Promise<Order | null> {
        return Order.findOne({
            where: { id },
            transaction,
            lock: Transaction.LOCK.UPDATE,
        });
    }

    /** PENDING orders older than the TTL (sweep job input). */
    static async listExpiredPending(cutoff: Date): Promise<Order[]> {
        return Order.findAll({
            // Op.lt (a plain "lt" key silently becomes `created_at = cutoff`,
            // which never matches — TTL expiry would never fire).
            where: { status: "PENDING", createdAt: { [Op.lt]: cutoff } },
            limit: 500,
        });
    }
}

export default OrderRepository;
