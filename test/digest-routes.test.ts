import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const dir = mkdtempSync(join(tmpdir(), 'rig-routes-'));
const line = (at: string, job: string, status: string, owner: string | null, error?: string) =>
  JSON.stringify({ at, job, status, owner, ...(error ? { error } : {}) });

const NORMAL = '2026-02-01';
const EMPTY = '2026-02-02';
const BAD = '2026-02-03';
const MISSING = '2026-02-04';

beforeAll(() => {
  writeFileSync(
    join(dir, `${NORMAL}.jsonl`),
    [
      line('2026-02-02T01:00:00+01:00', 'zeta/last', 'ok', 'rook'),
      line('2026-02-02T01:01:00+01:00', 'alpha/flaky', 'retry', 'rook', 'upstream 503'),
      line('2026-02-02T01:02:00+01:00', 'alpha/flaky', 'retry', 'rook', 'upstream 503'),
      line('2026-02-02T01:03:00+01:00', 'alpha/flaky', 'retry', 'rook', 'upstream 503'),
      line('2026-02-02T01:04:00+01:00', 'alpha/flaky', 'ok', 'rook'),
      line('2026-02-02T01:05:00+01:00', 'mid/broken', 'fail', 'wren', 'quota exceeded'),
      line('2026-02-02T01:06:00+01:00', 'mid/orphan', 'ok', null),
    ].join('\n') + '\n',
  );
  writeFileSync(join(dir, `${EMPTY}.jsonl`), '');
  writeFileSync(
    join(dir, `${BAD}.jsonl`),
    [line('2026-02-04T01:00:00+01:00', 'only/job', 'ok', 'rook'), '{not json'].join('\n') + '\n',
  );
});

const app = () => createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });

// The <tr> markup that mentions a job.
const rowFor = (html: string, job: string) => html.split('<tr').find((r) => r.includes(job)) ?? '';

describe('GET /digest/:night', () => {
  it('renders a normal night: banner, sorted rows, warn marks, dash for no owner', async () => {
    process.env.LANE_MARKER = 'TEST-MARKER';
    const res = await app().request(`/digest/${NORMAL}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('TEST-MARKER');
    const order = ['alpha/flaky', 'mid/broken', 'mid/orphan', 'zeta/last'].map((j) => html.indexOf(j));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(rowFor(html, 'alpha/flaky')).toContain('class="warn"'); // 3 retries
    expect(rowFor(html, 'mid/broken')).toContain('class="warn"'); // last status fail
    expect(rowFor(html, 'mid/orphan')).not.toContain('class="warn"');
    expect(rowFor(html, 'zeta/last')).not.toContain('class="warn"');
    expect(rowFor(html, 'mid/orphan')).toContain('—');
  });

  it('says nothing ran for an empty file', async () => {
    const res = await app().request(`/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('reports lines that did not parse', async () => {
    const res = await app().request(`/digest/${BAD}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('1 line did not parse');
    expect(html).toContain('only/job');
  });

  it('404s for a night with no file', async () => {
    const res = await app().request(`/digest/${MISSING}`);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain(`no run log for ${MISSING}`);
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the Night object for a normal night', async () => {
    const res = await app().request(`/api/digest/${NORMAL}`);
    expect(res.status).toBe(200);
    const night = (await res.json()) as Night;
    expect(night.night).toBe(NORMAL);
    expect(night.badLines).toBe(0);
    expect(night.counts).toEqual({ ok: 3, retry: 3, fail: 1 });
    expect(night.rows.map((r) => r.job)).toEqual(['alpha/flaky', 'mid/broken', 'mid/orphan', 'zeta/last']);
    expect(night.rows[0]).toMatchObject({ retries: 3, runs: 4, lastStatus: 'ok', lastError: 'upstream 503' });
    expect(night.rows[2]!.owner).toBeNull();
  });

  it('returns no rows for an empty file', async () => {
    const res = await app().request(`/api/digest/${EMPTY}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: EMPTY, rows: [], badLines: 0, counts: { ok: 0, retry: 0, fail: 0 } });
  });

  it('counts the bad line', async () => {
    const res = await app().request(`/api/digest/${BAD}`);
    expect(res.status).toBe(200);
    const night = (await res.json()) as Night;
    expect(night.badLines).toBe(1);
    expect(night.rows.map((r) => r.job)).toEqual(['only/job']);
  });

  it('404s with an error body for a night with no file', async () => {
    const res = await app().request(`/api/digest/${MISSING}`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no run log', night: MISSING });
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const html = await (await app().request(`/digest/${NORMAL}`)).text();
    const night = (await (await app().request(`/api/digest/${NORMAL}`)).json()) as Night;
    const jobs = night.rows.map((r) => r.job);
    const inPage = [...jobs].sort((a, b) => html.indexOf(a) - html.indexOf(b));
    expect(jobs.every((j) => html.includes(j))).toBe(true);
    expect(inPage).toEqual(jobs);
  });
});
