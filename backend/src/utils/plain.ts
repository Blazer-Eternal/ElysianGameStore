// Sequelize instance → plain object. Hides null bytes and defaults to the
// toJSON shape so controllers never leak internal model machinery.
export const plain = <T>(instance: unknown): T => {
    if (!instance) return instance as T;
    const maybe = instance as {
        toJSON?: () => unknown;
        get?: (key?: string) => unknown;
    };
    if (typeof maybe.toJSON === "function") return maybe.toJSON() as T;
    if (typeof maybe.get === "function") return maybe.get() as T;
    return instance as T;
};

export default plain;
