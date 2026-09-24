export function bindAst(ast, catalog) {
  const errors = []; const aliases = Object.fromEntries(ast.tables.map(table => [table.alias, table.name]));
  for (const table of ast.tables) if (!catalog[table.name]) errors.push({ message: `Table "${table.name}" is not present in the loaded schema.` });
  for (const predicate of ast.predicates) {
    let table = aliases[predicate.tableAlias];
    if (!table && predicate.column) { const candidates = ast.tables.filter(item => catalog[item.name]?.columns[predicate.column]); if (candidates.length === 1) table = candidates[0].name; if (candidates.length > 1) errors.push({ message: `Column "${predicate.column}" is ambiguous.` }); }
    predicate.table = table;
    if (table && !catalog[table]?.columns[predicate.column]) errors.push({ message: `Column "${predicate.column}" does not exist on "${table}".` });
  }
  for (const join of ast.joins) { const pair = /(?:(\w+)\.)?(\w+)\s*=\s*(?:(\w+)\.)?(\w+)/.exec(join.condition || ''); join.pair = pair ? [{ alias: pair[1], column: pair[2] }, { alias: pair[3], column: pair[4] }] : null; }
  return { ast, aliases, errors };
}
