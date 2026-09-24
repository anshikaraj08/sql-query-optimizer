import Fastify from 'fastify';
import cors from '@fastify/cors';
import 'dotenv/config';
import { analyze } from './analyzer.js';
import { catalogFromDdl } from './schema.js';
import { createDatabaseClient, explainPg, loadCatalogFromPg } from './postgres.js';

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });
const pool = createDatabaseClient(process.env.DATABASE_URL);

app.get('/api/health', async () => ({ ok: true, service: 'queryline-api', liveConfigured: Boolean(pool) }));

app.post('/api/schema/load', async (request, reply) => {
  const { ddl = '', mode = 'offline' } = request.body || {};
  if (typeof ddl !== 'string' || ddl.length > 50000) return reply.code(400).send({ error: 'DDL must be text under 50 KB.' });
  if (mode === 'live') { if (!pool) return reply.code(503).send({ error: 'Live mode needs DATABASE_URL in backend/.env.' }); return { catalog: await loadCatalogFromPg(pool) }; }
  return { catalog: catalogFromDdl(ddl) };
});

app.post('/api/analyze', async (request, reply) => {
  const { sql, ddl = '', mode = 'offline' } = request.body || {};
  if (!sql || typeof sql !== 'string') return reply.code(400).send({ error: 'A SQL query is required.' });
  if (sql.length > 20000) return reply.code(400).send({ error: 'Queries are limited to 20 KB.' });
  if (!['offline', 'live'].includes(mode)) return reply.code(400).send({ error: 'Mode must be offline or live.' });
  if (mode === 'live' && !pool) return reply.code(503).send({ error: 'Live mode needs DATABASE_URL in backend/.env. Use offline mode until it is configured.' });
  const catalog = mode === 'live' ? await loadCatalogFromPg(pool) : undefined;
  const result = analyze({ sql, ddl, mode, catalog });
  if (result.errors.length) return reply.code(422).send(result);
  if (mode === 'live') {
    const explain = await explainPg(pool, sql);
    result.originalPlan = explain.plan; result.postgresPlan = explain.raw;
    result.cost = { before: explain.plan.cost, after: undefined, source: 'postgres' };
  }
  return result;
});

app.post('/api/explain', async (request, reply) => {
  const { sql, ddl = '', mode = 'offline' } = request.body || {};
  if (!sql || typeof sql !== 'string') return reply.code(400).send({ error: 'A SQL query is required.' });
  if (mode === 'live' && !pool) return reply.code(503).send({ error: 'Live mode needs DATABASE_URL in backend/.env.' });
  const catalog = mode === 'live' ? await loadCatalogFromPg(pool) : undefined;
  const result = analyze({ sql, ddl, mode, catalog });
  if (result.errors.length) return reply.code(422).send(result);
  if (mode === 'live') { const explain = await explainPg(pool, sql); return { raw: explain.raw, plan: explain.plan, source: 'postgres' }; }
  return { raw: null, plan: result.originalPlan, source: 'offline estimate' };
});

await app.listen({ port: Number(process.env.PORT || 4000), host: '0.0.0.0' });
