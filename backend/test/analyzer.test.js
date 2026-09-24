import assert from 'node:assert/strict';
import test from 'node:test';
import { analyze } from '../src/analyzer.js';
import { catalogFromDdl } from '../src/schema.js';

test('loads a DDL schema and recognizes its indexes', () => {
  const catalog = catalogFromDdl('CREATE TABLE products (id INT PRIMARY KEY, sku TEXT); CREATE INDEX idx_products_sku ON products (sku);');
  assert.equal(catalog.products.columns.sku.type, 'text');
  assert.equal(catalog.products.indexes[1].columns[0], 'sku');
});

test('finds an unindexed filtered scan and suggests an index', () => {
  const result = analyze({ sql: "SELECT id FROM orders WHERE status = 'paid';" });
  assert.equal(result.errors.length, 0);
  assert.ok(result.findings.some(item => item.ruleId === 'full-table-scan'));
  assert.ok(result.indexSuggestions.includes('CREATE INDEX idx_orders_status ON orders (status);'));
  assert.ok(result.cost.after < result.cost.before);
});

test('rejects unsupported SQL safely', () => {
  const result = analyze({ sql: 'DELETE FROM orders;' });
  assert.equal(result.errors[0].message, 'Only SELECT statements are supported.');
});
