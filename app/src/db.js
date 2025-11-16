// src/db.js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'vendasdb',
});

async function runMigrationsAndSeed() {
  console.log('🔄 Iniciando criação de tabelas...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id   SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales (
      id          SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      value       NUMERIC(10,2) NOT NULL,
      created_at  TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  console.log('✅ Tabelas garantidas (categories, sales).');

  const result = await pool.query('SELECT COUNT(*) AS count FROM categories');
  const count = Number(result.rows[0].count);

  if (count === 0) {
    console.log('🌱 Populando banco com dados de exemplo...');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const categories = ['Eletrônicos', 'Roupas', 'Alimentos', 'Livros'];
      const categoryIds = [];

      for (const name of categories) {
        const res = await client.query(
          'INSERT INTO categories (name) VALUES ($1) RETURNING id, name',
          [name]
        );
        categoryIds.push(res.rows[0]);
      }

      const sales = [
        { cat: 'Eletrônicos', value: 2500.00 },
        { cat: 'Eletrônicos', value: 1999.99 },
        { cat: 'Eletrônicos', value: 350.50 },
        { cat: 'Roupas',      value: 120.00 },
        { cat: 'Roupas',      value: 80.90 },
        { cat: 'Roupas',      value: 200.00 },
        { cat: 'Alimentos',   value: 35.50 },
        { cat: 'Alimentos',   value: 89.10 },
        { cat: 'Alimentos',   value: 15.00 },
        { cat: 'Livros',      value: 59.90 },
        { cat: 'Livros',      value: 39.90 },
        { cat: 'Livros',      value: 89.90 },
        { cat: 'Eletrônicos', value: 499.90 },
        { cat: 'Roupas',      value: 60.00 },
        { cat: 'Alimentos',   value: 27.75 },
        { cat: 'Eletrônicos', value: 799.90 },
        { cat: 'Alimentos',   value: 12.30 },
        { cat: 'Livros',      value: 24.90 },
        { cat: 'Roupas',      value: 140.00 },
        { cat: 'Eletrônicos', value: 150.00 }
      ];

      const now = new Date();

      for (let i = 0; i < sales.length; i++) {
        const sale = sales[i];
        const category = categoryIds.find((c) => c.name === sale.cat);
        const date = new Date(now.getTime() - i * 3600 * 1000);

        await client.query(
          `
          INSERT INTO sales (category_id, value, created_at)
          VALUES ($1, $2, $3)
          `,
          [category.id, sale.value, date]
        );
      }

      await client.query('COMMIT');
      console.log('✅ Seed concluído.');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Erro ao popular banco:', err);
    } finally {
      client.release();
    }
  } else {
    console.log(`ℹ️ Banco já tinha ${count} categorias, seed ignorado.`);
  }
}

async function initDbWithRetry(maxRetries = 10, delayMs = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Tentando conectar ao banco (tentativa ${attempt}/${maxRetries})...`);
      await runMigrationsAndSeed();
      console.log('✅ Banco inicializado com sucesso');
      return;
    } catch (err) {
      console.error('Erro ao inicializar banco:', err.code || err.message);

      if (attempt === maxRetries) {
        console.error('🚨 Máximo de tentativas atingido, abortando.');
        throw err;
      }

      console.log(`⏳ Aguardando ${(delayMs / 1000)}s para tentar de novo...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

module.exports = { pool, initDbWithRetry };
