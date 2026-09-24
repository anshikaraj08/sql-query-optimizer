import { parseSql } from './parser.js';
import { catalogFromDdl } from './schema.js';
import { bindAst } from './binder.js';
import { buildPlan } from './planner.js';
import { runRules } from './rules.js';
import { buildRewrite } from './rewriter.js';

export function analyze({ sql, ddl = '', mode = 'offline', catalog: suppliedCatalog }) {
  const parsed = parseSql(sql); if (parsed.errors.length) return { errors: parsed.errors, findings: [] };
  const catalog = suppliedCatalog || catalogFromDdl(ddl); const bound = bindAst(parsed.ast, catalog); if (bound.errors.length) return { ast: parsed.ast, errors: bound.errors, findings: [] };
  const originalPlan = buildPlan(bound, catalog); const findings = runRules(bound, catalog, originalPlan); const rewrite = buildRewrite(parsed.ast, findings, catalog); const rewrittenPlan = rewrite.indexSuggestions.length ? buildPlan(bound, rewrite.proposedCatalog) : undefined;
  return { ast: parsed.ast, errors: [], findings, originalPlan, indexSuggestions: rewrite.indexSuggestions, rewrittenSql: rewrite.rewrittenSql, rewrittenPlan, cost: { before: originalPlan.summary.cost, after: rewrittenPlan?.summary.cost, source: mode === 'live' ? 'postgres' : 'estimate' }, equivalence: { checked: false, equal: false, sampleRows: 0 }, catalog };
}
