require('dotenv').config({ debug: false, override: true, quiet: true });

const base = {
  host: process.env.DB_HOST || 'localhost',
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ElysianGameStore',
  port: Number(process.env.DB_PORT) || 5432,
  dialect: process.env.DB_DIALECT || 'postgres',
};

module.exports = {
  development: base,
  production: base,
  test: base,
};
