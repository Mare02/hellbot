const { execFile } = require('node:child_process');
const path = require('node:path');
const { promisify } = require('node:util');

const runFile = promisify(execFile);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const CACHE_DURATION_MS = 60_000;

function createCodeUpdatesService() {
  let cachedHistory;
  let expiresAt = 0;
  let pending;

  async function git(args) {
    const { stdout } = await runFile('git', args, {
      cwd: PROJECT_ROOT,
      timeout: 10_000,
      maxBuffer: 8 * 1024 * 1024,
    });
    return stdout.trim();
  }

  async function readHistory() {
    if (pending) return pending;
    pending = (async () => {
      const [head, branch, shallow] = (await git([
        'rev-parse', 'HEAD', '--abbrev-ref', 'HEAD', '--is-shallow-repository',
      ])).split('\n');
      const isShallow = shallow === 'true';
      if (
        cachedHistory && Date.now() < expiresAt &&
        cachedHistory.head === head &&
        cachedHistory.branch === branch &&
        cachedHistory.shallow === isShallow
      ) {
        return cachedHistory;
      }

      const log = await git(['log', 'HEAD', '--format=%H%x09%ct%x09%s']);
      const commits = log.split('\n').filter(Boolean).map((line) => {
        const [hash, timestamp, ...subject] = line.split('\t');
        const committedAt = new Date(Number(timestamp) * 1000).toISOString();
        return { hash, committedAt, date: committedAt.slice(0, 10), subject: subject.join('\t') };
      });
      commits.sort((first, second) => second.committedAt.localeCompare(first.committedAt));
      cachedHistory = { head, branch, shallow: isShallow, commits };
      expiresAt = Date.now() + CACHE_DURATION_MS;
      return cachedHistory;
    })();
    try {
      return await pending;
    } finally {
      pending = null;
    }
  }

  async function summary(year) {
    const history = await readHistory();
    const today = new Date().toISOString().slice(0, 10);
    const currentYear = Number(today.slice(0, 4));
    const startDate = `${year}-01-01`;
    const endDate = year === currentYear ? today : `${year}-12-31`;
    const commits = history.commits.filter((commit) => commit.date >= startDate && commit.date <= endDate);
    const days = {};
    const monthlyCounts = Array(12).fill(0);
    const cursor = new Date(`${startDate}T00:00:00Z`);
    while (cursor.toISOString().slice(0, 10) <= endDate) {
      days[cursor.toISOString().slice(0, 10)] = 0;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    for (const commit of commits) {
      days[commit.date] += 1;
      monthlyCounts[Number(commit.date.slice(5, 7)) - 1] += 1;
    }
    const counts = Object.values(days);
    const maxDailyCommits = Math.max(0, ...counts);
    const busiestMonthCount = Math.max(0, ...monthlyCounts);
    const busiestMonthIndex = monthlyCounts.findIndex((count) => count === busiestMonthCount);
    const busiestMonth = busiestMonthCount === 0
      ? '—'
      : new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' })
        .format(new Date(Date.UTC(year, busiestMonthIndex, 1)));
    let longestStreak = 0;
    let currentStreak = 0;
    for (const count of counts) {
      currentStreak = count > 0 ? currentStreak + 1 : 0;
      longestStreak = Math.max(longestStreak, currentStreak);
    }
    const years = [...new Set([
      currentYear,
      year,
      ...history.commits.map((commit) => Number(commit.date.slice(0, 4))),
    ])].filter((value) => value >= 1970 && value <= currentYear).sort((first, second) => second - first);
    return {
      year,
      years,
      branch: history.branch,
      shallow: history.shallow,
      timezone: 'UTC',
      startDate,
      endDate,
      days,
      total: commits.length,
      activeDays: counts.filter((count) => count > 0).length,
      maxDailyCommits,
      busiestMonth,
      longestStreak,
      recentCommits: commits.slice(0, 20),
    };
  }

  return { summary };
}

module.exports = { createCodeUpdatesService };
