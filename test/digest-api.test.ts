import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

describe('GET /api/digest/:night', () => {
  it('returns the Night with rows sorted by job', async () => {
    const app = createApp({ ...loadConfig(), runsDir: 'runs' });
    const res = await app.request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rows.map((r: { job: string }) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('404 when the night has no file, 200 with no rows when empty', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-'));
    writeFileSync(join(dir, '2026-01-02.jsonl'), '');
    const app = createApp({ ...loadConfig(), runsDir: dir });
    const missing = await app.request('/api/digest/2026-01-01');
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: 'no run log', night: '2026-01-01' });
    const empty = await app.request('/api/digest/2026-01-02');
    expect(empty.status).toBe(200);
    expect((await empty.json()).rows).toEqual([]);
  });
});
