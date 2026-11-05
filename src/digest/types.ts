// Plan morning-digest § 1. The contract every part of § 2 builds against: the page, the JSON,
// the board link and the route tests all read a night through `readNight`, never the file.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing at the edge.
export type RunLine = {
  at: string; // ISO 8601 with the log's own offset; never converted to UTC
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job in a night.
export type DigestRow = {
  job: string;
  owner: string | null; // from the job's last line; null renders as `—`
  runs: number; // lines for this job, every status
  retries: number; // lines with status `retry`
  lastStatus: RunStatus; // status of the job's last line
  lastError: string | null; // most recent `error` for this job, even if it later went ok
  firstAt: string; // `at` of the job's first line, offset kept
  lastAt: string; // `at` of the job's last line, offset kept
};

export type Night = {
  night: string; // YYYY-MM-DD, as in the file name
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse; counted, never thrown
};

// Reads runs/<night>.jsonl. Returns null when the night has no file; an empty file is a Night
// with no rows. Never throws on a bad line.
export type ReadNight = (runsDir: string, night: string) => Night | null;
