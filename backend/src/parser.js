import { cleanIdentifier, splitTopLevel } from './utils.js';

const clauseAt = (sql, keyword) => { const match = new RegExp(`\\b${keyword.replace(' ', '\\s+')}\\b`, 'i').exec(sql); return match ? match.index : -1; };
function parseTable(value) { const match = /^\s*([\w."]+)(?:\s+(?:as\s+)?([\w"]+))?\s*$/i.exec(value); return match ? { name: cleanIdentifier(match[1].split('.').pop()), alias: cleanIdentifier(match[2] || match[1].split('.').pop()) } : null; }
function parsePredicate(text) { const trimmed = text.trim().replace(/^\(|\)$/g, ''); const functionMatch = /^(lower|upper|date|coalesce|cast)\s*\(\s*([\w."]+)/i.exec(trimmed); const comparison = /(.+?)\s*(=|<>|!=|<=|>=|<|>|like|in)\s*(.+)/i.exec(trimmed); const left = comparison?.[1]?.trim() || trimmed; const column = /(?:(\w+)\.)?([\w"]+)/.exec(functionMatch?.[2] || left);
  return { raw: trimmed, operator: comparison?.[2]?.toUpperCase(), value: comparison?.[3]?.trim(), tableAlias: cleanIdentifier(column?.[1] || ''), column: cleanIdentifier(column?.[2] || ''), function: functionMatch?.[1]?.toLowerCase(), sargable: Boolean(comparison && !functionMatch && !/[+*/-]/.test(left)), leadingWildcard: Boolean(comparison && /like/i.test(comparison[2]) && /^['"]%/.test(comparison[3].trim())) };
}

export function parseSql(input) {
  const sql = input.trim(); const errors = [];
  if (!/^select\b/i.test(sql)) errors.push({ message: 'Only SELECT statements are supported.' });
  const statement = sql.replace(/;\s*$/, ''); if (/;/.test(statement)) errors.push({ message: 'Only one SQL statement may be analyzed.' });
  if (errors.length) return { errors, ast: null };
  const fromIndex = clauseAt(statement, 'from'); if (fromIndex < 0) return { errors: [{ message: 'A SELECT query needs a FROM clause.' }], ast: null };
  const whereIndex = clauseAt(statement, 'where'); const groupIndex = clauseAt(statement, 'group by'); const orderIndex = clauseAt(statement, 'order by'); const limitIndex = clauseAt(statement, 'limit');
  const endFrom = [whereIndex, groupIndex, orderIndex, limitIndex, statement.length].filter(index => index > fromIndex).sort((a,b) => a-b)[0];
  const source = statement.slice(fromIndex + 4, endFrom).trim(); const columns = splitTopLevel(statement.slice(6, fromIndex)).map(value => value.trim()); const joins = []; const tables = [];
  const first = source.split(/\b(?:inner|left|right|full|cross)?\s*join\b/i)[0].trim();
  for (const table of splitTopLevel(first)) { const parsed = parseTable(table); if (parsed) tables.push(parsed); }
  const joinPattern = /\b(?:(inner|left|right|full|cross)\s+)?join\s+([\w."]+)(?:\s+(?:as\s+)?([\w"]+))?\s*(?:on\s+([\s\S]*?))?(?=\b(?:inner|left|right|full|cross)?\s*join\b|$)/gi;
  for (const match of source.matchAll(joinPattern)) { const table = { name: cleanIdentifier(match[2].split('.').pop()), alias: cleanIdentifier(match[3] || match[2].split('.').pop()) }; tables.push(table); joins.push({ type: (match[1] || 'inner').toUpperCase(), table, condition: match[4]?.trim() || null }); }
  const endWhere = [groupIndex, orderIndex, limitIndex, statement.length].filter(index => index > whereIndex).sort((a,b) => a-b)[0]; const whereText = whereIndex > -1 ? statement.slice(whereIndex + 5, endWhere).trim() : '';
  return { errors, ast: { id: 'select-root', kind: 'Select', sql: statement, columns, tables, joins, predicates: whereText ? splitTopLevel(whereText.replace(/\s+and\s+/gi, ','), ',').map(parsePredicate) : [], hasStar: columns.some(column => /(^|\s)\*/.test(column)), cartesian: tables.length > 1 && !joins.length && !whereText } };
}
