export function buildRewrite(ast, findings, catalog) {
  const suggestions = findings.flatMap(item => item.suggestion?.kind === 'index' ? [item.suggestion.sql] : []); let rewrittenSql = ast.sql;
  const rewrite = findings.find(item => item.ruleId === 'non-sargable-predicate')?.suggestion?.sql;
  if (rewrite) { const original = ast.predicates.find(predicate => predicate.function)?.raw; if (original) rewrittenSql = rewrittenSql.replace(original, rewrite); }
  const proposedCatalog = structuredClone(catalog);
  for (const statement of suggestions) { const match = /idx_(\w+)_(\w+)\s+on\s+(\w+)\s*\((\w+)\)/i.exec(statement); if (match && proposedCatalog[match[3]]) proposedCatalog[match[3]].indexes.push({ name: `idx_${match[1]}_${match[2]}`, columns: [match[4]] }); }
  return { indexSuggestions: [...new Set(suggestions)], rewrittenSql: rewrittenSql === ast.sql ? undefined : rewrittenSql, proposedCatalog };
}
