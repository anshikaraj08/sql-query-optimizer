import { cleanIdentifier, splitTopLevel } from './utils.js';

export const demoCatalog = {
  users: { rowCount: 10000, columns: { id: { type: 'integer' }, email: { type: 'text' }, country: { type: 'text' }, created_at: { type: 'timestamp' } }, indexes: [{ name: 'users_pkey', columns: ['id'], primary: true }, { name: 'users_email_key', columns: ['email'], unique: true }] },
  orders: { rowCount: 200000, columns: { id: { type: 'integer' }, user_id: { type: 'integer' }, status: { type: 'text' }, total: { type: 'numeric' }, created_at: { type: 'timestamp' } }, indexes: [{ name: 'orders_pkey', columns: ['id'], primary: true }] },
  order_items: { rowCount: 400000, columns: { id: { type: 'integer' }, order_id: { type: 'integer' }, product_id: { type: 'integer' }, quantity: { type: 'integer' } }, indexes: [{ name: 'order_items_pkey', columns: ['id'], primary: true }] }
};

export function catalogFromDdl(ddl = '') {
  if (!ddl.trim()) return structuredClone(demoCatalog);
  const catalog = {};
  const tablePattern = /create\s+table\s+(?:if\s+not\s+exists\s+)?([\w."]+)\s*\(([\s\S]*?)\)\s*;/gi;
  for (const match of ddl.matchAll(tablePattern)) {
    const table = cleanIdentifier(match[1].split('.').pop()); const columns = {}; const indexes = [];
    for (const part of splitTopLevel(match[2])) {
      const primary = /primary\s+key\s*\(([^)]+)\)/i.exec(part);
      if (primary) { indexes.push({ name: `${table}_pkey`, columns: splitTopLevel(primary[1]).map(cleanIdentifier), primary: true }); continue; }
      const column = /^\s*([\w"]+)\s+([\w]+(?:\s*\([^)]*\))?)/i.exec(part);
      if (column && !/^(constraint|foreign|unique|check)/i.test(column[1])) {
        const name = cleanIdentifier(column[1]); columns[name] = { type: column[2].toLowerCase() };
        if (/primary\s+key/i.test(part)) indexes.push({ name: `${table}_pkey`, columns: [name], primary: true });
        if (/\bunique\b/i.test(part)) indexes.push({ name: `${table}_${name}_key`, columns: [name], unique: true });
      }
    }
    catalog[table] = { rowCount: 100000, rowCountSource: 'default estimate', columns, indexes };
  }
  const indexPattern = /create\s+(unique\s+)?index\s+(?:if\s+not\s+exists\s+)?([\w"]+)\s+on\s+([\w."]+)\s*\(([^)]+)\)/gi;
  for (const match of ddl.matchAll(indexPattern)) { const table = cleanIdentifier(match[3].split('.').pop()); if (catalog[table]) catalog[table].indexes.push({ name: cleanIdentifier(match[2]), columns: splitTopLevel(match[4]).map(value => cleanIdentifier(value.split(/\s+/)[0])), unique: Boolean(match[1]) }); }
  return Object.keys(catalog).length ? catalog : structuredClone(demoCatalog);
}
