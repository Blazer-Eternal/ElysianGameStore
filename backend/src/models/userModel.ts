import { DataTypes, Model, ModelAttributes, Sequelize } from "sequelize";

import { Role, ROLES } from "../enums/roleEnum";
import { UserStatus, USER_STATUSES } from "../enums/userStatusEnum";
import { IUser, IUserCreation } from "../interfaces/userInterface";

// Users are soft-deleted only (status = DELETED): orders must remain for
// legal reasons. email/username are case-insensitively unique via lower()
// unique indexes created in the migration.
class User extends Model<IUser, IUserCreation> implements IUser {
    declare id: string;
    declare email: string;
    declare username: string;
    declare passwordHash: string;
    declare role: Role;
    declare countryCode: string | null;
    declare birthDate: Date | null;
    declare status: UserStatus;
    declare emailVerifiedAt: Date | null;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;

    static initModel(sequelize: Sequelize): void {
        User.init(
            {
                id: {
                    type: DataTypes.UUID,
                    defaultValue: DataTypes.UUIDV4,
                    primaryKey: true,
                },
                email: { type: DataTypes.STRING(320), allowNull: false },
                username: { type: DataTypes.STRING(50), allowNull: false },
                passwordHash: { type: DataTypes.STRING(255), allowNull: false },
                role: {
                    type: DataTypes.ENUM(...ROLES),
                    allowNull: false,
                    defaultValue: Role.CUSTOMER,
                },
                countryCode: { type: DataTypes.STRING(2), allowNull: true },
                birthDate: { type: DataTypes.DATE, allowNull: true },
                status: {
                    type: DataTypes.ENUM(...USER_STATUSES),
                    allowNull: false,
                    defaultValue: UserStatus.ACTIVE,
                },
                emailVerifiedAt: { type: DataTypes.DATE, allowNull: true },
            } as unknown as ModelAttributes<User, IUser>, // Sequelize manages timestamps
            {
                sequelize,
                tableName: "users",
                timestamps: true,
                underscored: true,
            },
        );
    }
}

export default User;
