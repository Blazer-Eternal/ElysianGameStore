import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { MODERATION_STATUSES, ModerationStatus } from "../enums/moderationStatusEnum";
import { IReview, IReviewCreation } from "../interfaces/reviewInterface";

// Owners only (unique user_id + game_id, checked against the library).
// recommend feeds the "Top Rated" ratio; rating is an optional 1-5 star value.
class Review extends Model<IReview, IReviewCreation> implements IReview {
    declare id: string;
    declare userId: string;
    declare gameId: string;
    declare recommend: boolean;
    declare rating: number | null;
    declare body: string | null;
    declare playtimeMinutes: number;
    declare helpfulCount: number;
    declare moderationStatus: ModerationStatus;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        Review.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                userId: { type: DataTypes.UUID, allowNull: false },
                gameId: { type: DataTypes.UUID, allowNull: false },
                recommend: { type: DataTypes.BOOLEAN, allowNull: false },
                rating: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    validate: { min: 1, max: 5 },
                },
                body: { type: DataTypes.TEXT, allowNull: true },
                playtimeMinutes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                helpfulCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                moderationStatus: {
                    type: DataTypes.ENUM(...MODERATION_STATUSES),
                    allowNull: false,
                    defaultValue: ModerationStatus.APPROVED,
                },
            } as unknown as ModelAttributes<Review, IReview>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "reviews",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default Review;
