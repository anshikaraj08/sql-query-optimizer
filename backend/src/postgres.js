import pg from 'pg';

const { Pool } = pg;

export function createDatabaseClient(connectionString) {
  if (!connectionString) return null;
  return new Pool({ connectionString, max: 5, ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false } });
}

const toNumber = value => Number.isFinite(Number(value)) ? Number(value) : 0;

export async function loadCatalogFromPg(pool) {
  const [columns, indexes, rows] = await Promise.all([
    pool.query(`SELECT table_name, column_name, data_type, is_nullable = 'YES' AS nullable
                FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`),
    pool.query(`SELECT t.relname AS table_name, i.relname AS index_name, ix.indisunique AS is_unique,
                       ix.indisprimary AS is_primary, array_agg(a.attname ORDER BY key.ord) AS columns
                FROM pg_index ix JOIN pg_class t ON t.oid = ix.indrelid JOIN pg_class i ON i.oid = ix.indexrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS key(attnum, ord)
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = key.attnum
                WHERE n.nspname = 'public' AND key.attnum > 0 GROUP BY 1,2,3,4`),
    pool.query(`SELECT c.relname AS table_name, c.reltuples::bigint AS row_estimate
                FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' AND c.relkind = 'r'`)
  ]);
  const catalog = {};
  for (const column of columns.rows) {
    const table = column.table_name.toLowerCase();
    catalog[table] ||= { rowCount: 0, columns: {}, indexes: [] };
    catalog[table].columns[column.column_name.toLowerCase()] = { type: column.data_type, nullable: column.nullable };
  }
  for (const row of rows.rows) if (catalog[row.table_name]) catalog[row.table_name].rowCount = toNumber(row.row_estimate);
  for (const index of indexes.rows) if (catalog[index.table_name]) catalog[index.table_name].indexes.push({ name: index.index_name, columns: index.columns, unique: index.is_unique, primary: index.is_primary });
  return catalog;
}

function mapPlan(node, counter = { value: 0 }) {
  const id = `pg-plan-${counter.value++}`; const children = (node.Plans || []).map(child => mapPlan(child, counter));
  const access = /Index/.test(node['Node Type']) ? 'Index' : /Seq Scan/.test(node['Node Type']) ? 'Seq' : undefined;
  return { id, op: node['Node Type'], table: node['Relation Name'], access, index: node['Index Name'], rows: toNumber(node['Plan Rows']), cost: toNumber(node['Total Cost']), filter: node.Filter || node['Index Cond'], label: node['Relation Name'] ? `${node['Node Type']} on ${node['Relation Name']}` : node['Node Type'], children };
}

function scanNodes(plan) { return [plan, ...plan.children.flatMap(scanNodes)].filter(node => node.access); }

export async function explainPg(pool, sql) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '5s'");
    const response = await client.query(`EXPLAIN (FORMAT JSON) ${sql}`);
    await client.query('ROLLBACK');
    const rawRoot = response.rows[0]['QUERY PLAN'][0].Plan; const plan = mapPlan(rawRoot);
    plan.scans = scanNodes(plan); plan.summary = { cost: plan.cost, rows: plan.rows, label: `${plan.rows} rows · cost ${plan.cost}` };
    return { raw: response.rows[0]['QUERY PLAN'][0], plan };
  } catch (error) { try { await client.query('ROLLBACK'); } catch {} throw error; } finally { client.release(); }
}
