export async function analyzeQuery(payload) {
  const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || result.errors?.[0]?.message || 'Analysis failed.');
  return result;
}

export async function loadSchema(ddl, mode = 'offline') {
  const response = await fetch('/api/schema/load', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ddl, mode }) });
  if (!response.ok) throw new Error('Could not load schema context.');
  return response.json();
}
