// src/server.js
const express = require('express');
const cors = require('cors');
const promClient = require('prom-client');
const { pool } = require('./db');
const { initDbWithRetry } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ===== Prometheus =====
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total de requisições HTTP',
  labelNames: ['method', 'route', 'status_code']
});

register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);

// Middleware de métrica por request
app.use((req, res, next) => {
  const startTimer = httpRequestDuration.startTimer();

  res.on('finish', () => {
    const route = req.route?.path || req.path || 'unknown_route';
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode
    };

    httpRequestsTotal.inc(labels);
    startTimer(labels);
  });

  next();
});

// ===== Rotas =====

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API de vendas com Prometheus & PostgreSQL' });
});

app.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

app.post('/categories', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });

  try {
    const result = await pool.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING *',
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

app.get('/sales', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.value,
        s.created_at,
        s.category_id,
        c.name AS category_name
      FROM sales s
      JOIN categories c ON c.id = s.category_id
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar vendas' });
  }
});

app.post('/sales', async (req, res) => {
  const { category_id, value } = req.body;
  if (!category_id || !value) {
    return res.status(400).json({ error: 'category_id e value são obrigatórios' });
  }

  try {
    const cat = await pool.query('SELECT * FROM categories WHERE id = $1', [category_id]);
    if (cat.rows.length === 0) {
      return res.status(400).json({ error: 'Categoria inválida' });
    }

    const result = await pool.query(
      `
      INSERT INTO sales (category_id, value)
      VALUES ($1, $2)
      RETURNING id, category_id, value, created_at
      `,
      [category_id, value]
    );

    const sale = await pool.query(
      `
      SELECT
        s.id,
        s.value,
        s.created_at,
        s.category_id,
        c.name AS category_name
      FROM sales s
      JOIN categories c ON c.id = s.category_id
      WHERE s.id = $1
      `,
      [result.rows[0].id]
    );

    res.status(201).json(sale.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar venda' });
  }
});

// /metrics
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (err) {
    console.error('Erro ao gerar métricas:', err);
    res.status(500).send('Erro ao gerar métricas');
  }
});

// ===== Inicialização =====
(async () => {
  try {
    await initDbWithRetry();
    app.listen(PORT, () => {
      console.log(`🚀 API rodando na porta ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Falha crítica ao inicializar banco:', err);
    process.exit(1);
  }
})();
