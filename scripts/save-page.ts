// Plan morning-digest § 3–4. Saves one rig page as a single self-contained HTML file (ADR 0001:
// one inline stylesheet, no client JS), for a preview on a public host (ADR 0003).
//   pnpm preview                -> var/preview/digest-2026-10-28.html, lane marker from .env
//   pnpm preview --no-marker    -> the same page with LANE_MARKER unset ("no marker set")
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from '../src/app.js';

const args = process.argv.slice(2);
if (args.includes('--no-marker')) delete process.env.LANE_MARKER;
const [path = '/digest/2026-10-28', out = `var/preview${path.replaceAll('/', '-').replace(/^-/, '/')}.html`] = args.filter(
  (a) => !a.startsWith('--'),
);

const res = await createApp().request(path);
if (res.status !== 200) {
  console.error(`${path}: ${res.status}`);
  process.exit(1);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, await res.text());
console.log(`${path} -> ${out} (marker: ${process.env.LANE_MARKER?.trim() || 'none'})`);
