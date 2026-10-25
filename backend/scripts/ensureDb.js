// Dev helper: ensures the ElysianGameStore database exists (idempotent).
const { Client } = require("pg");

(async () => {
    const client = new Client({
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
    });
    try {
        await client.connect();
        const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
            "ElysianGameStore",
        ]);
        if (exists.rowCount === 0) {
            await client.query('CREATE DATABASE "ElysianGameStore"');
            console.log("Database ElysianGameStore created.");
        } else {
            console.log("Database ElysianGameStore already exists.");
        }
        await client.end();
    } catch (error) {
        console.error("Could not ensure database:", error.message);
        process.exit(1);
    }
})();
