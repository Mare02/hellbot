const { execFile } = require('node:child_process');
const path = require('node:path');
const { promisify } = require('node:util');
const { createRedactor } = require('./logging/redaction');
const { readRelease } = require('./deployments/release');
const { requestBot } = require('./ipc');

const runFile = promisify(execFile);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const WORKFLOW = '.github/workflows/main.yml';
const LOG_LIMIT = 1024 * 1024;

function deploymentError(message, status = 503) {
  return Object.assign(new Error(message), { status, deploymentError: true });
}

function createDeploymentsService(database, profile, { secretProvider, fetchImpl = fetch } = {}) {
  const cache = new Map();
  const pending = new Map();
  const redactor = createRedactor(secretProvider, { maxStringLength: LOG_LIMIT * 2 });
  const token = process.env.HELLBOT_GITHUB_TOKEN?.trim();
  const runtimeSha = process.env.DEPLOY_SHA || null;

  async function cached(key, ttl, load) {
    const entry = cache.get(key);
    if (entry && entry.expires > Date.now()) return entry.value;
    if (pending.has(key)) return pending.get(key);
    const task = load().then((value) => {
      if (cache.size >= 40) cache.delete(cache.keys().next().value);
      cache.set(key, { value, expires: Date.now() + ttl });
      return value;
    }).finally(() => pending.delete(key));
    pending.set(key, task);
    return task;
  }

  async function git(args) {
    const { stdout } = await runFile('git', args, {
      cwd: PROJECT_ROOT, timeout: 5000, maxBuffer: 64 * 1024,
    });
    return stdout.trim();
  }

  async function repository() {
    return cached('repository', 60_000, async () => {
      const remote = await git(['remote', 'get-url', 'origin']);
      const match = /^(?:git@github\.com:|https:\/\/github\.com\/)([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(remote);
      if (!match) throw deploymentError('Deploy history requires a GitHub origin remote.');
      return match[1];
    });
  }

  async function github(repo, endpoint, { raw = false } = {}) {
    if (!token) throw deploymentError('Set HELLBOT_GITHUB_TOKEN on the dashboard server with Actions: read access to this repository.');
    let response;
    try {
      response = await fetchImpl(`https://api.github.com/repos/${repo}/actions/${endpoint}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'Hellbot-dashboard',
        },
        redirect: 'manual', signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw deploymentError('GitHub could not be reached. Try again shortly.');
    }
    if (raw && [302, 404, 410].includes(response.status)) return response;
    if (!response.ok) {
      if (response.status === 401) throw deploymentError('GitHub rejected HELLBOT_GITHUB_TOKEN. Check or replace the server token.');
      if ([403, 429].includes(response.status))
        throw deploymentError('GitHub access is restricted or rate limited. Check Actions: read permission and retry shortly.');
      if (response.status === 404)
        throw deploymentError('The deploy run or repository is unavailable to the configured GitHub token.', 404);
      throw deploymentError('GitHub deployment data is temporarily unavailable.');
    }
    if (raw) return response;
    try {
      return await response.json();
    } catch {
      throw deploymentError('GitHub returned an unreadable response. Try again shortly.');
    }
  }

  function runSummary(run) {
    const startedAt = run.run_started_at || null;
    const completedAt = run.status === 'completed' ? run.updated_at : null;
    return {
      id: run.id, number: run.run_number, attempt: run.run_attempt,
      title: run.display_title || run.head_commit?.message?.split('\n')[0] || 'Deployment',
      sha: run.head_sha, branch: run.head_branch,
      status: run.status, conclusion: run.conclusion,
      createdAt: run.created_at, startedAt, completedAt,
      durationSeconds: startedAt && completedAt
        ? Math.max(0, Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 1000)) : null,
      actor: run.triggering_actor?.login || run.actor?.login || null,
      url: `https://github.com/${run.repository.full_name}/actions/runs/${run.id}/attempts/${run.run_attempt}`,
    };
  }

  async function summary(page) {
    const [repo, checkout] = await Promise.all([
      repository(),
      git(['rev-parse', 'HEAD', '--abbrev-ref', 'HEAD']).then((value) => {
        const [sha, branch] = value.split('\n');
        return { sha, branch };
      }),
    ]);
    const verified = readRelease(database, profile);
    const bot = verified ? await requestBot(profile) : null;
    const healthy = verified && runtimeSha === verified.sha && bot?.online && bot.ready &&
      bot.deploymentSha === verified.sha;
    const live = healthy ? {
      ...verified,
      title: await cached(`release-title:${verified.sha}`, 60_000, () =>
        git(['show', '-s', '--format=%s', verified.sha, '--']).catch(() => null)),
    } : null;
    const liveNotice = verified && !live
      ? 'The running processes have not both confirmed the last verified revision. Check the latest deploy steps and bot status.'
      : null;
    const base = {
      repository: repo, workflowUrl: `https://github.com/${repo}/actions/workflows/main.yml`,
      configured: Boolean(token), notice: null, page,
      live, liveNotice, checkout,
    };
    if (!token) return {
      ...base, runs: [], hasMore: false,
      notice: 'Set HELLBOT_GITHUB_TOKEN on the dashboard server with Actions: read access to this repository to view deployments and logs.',
    };
    try {
      const result = await cached(`list:${page}`, 15_000, () =>
        github(repo, `workflows/main.yml/runs?branch=main&per_page=20&page=${page}`));
      return {
        ...base, runs: result.workflow_runs.map(runSummary),
        hasMore: page * 20 < Math.min(result.total_count, 1000),
      };
    } catch (error) {
      if (!error.deploymentError) throw error;
      return { ...base, runs: [], hasMore: false, historyError: error.message };
    }
  }

  async function runData(id, attempt) {
    const repo = await repository();
    const run = await cached(`run:${id}`, 15_000, () => github(repo, `runs/${id}`));
    if (run.path?.split('@')[0] !== WORKFLOW || run.head_branch !== 'main')
      throw deploymentError('This run does not belong to the production deploy workflow.', 404);
    const selectedAttempt = attempt || run.run_attempt;
    if (selectedAttempt > run.run_attempt) throw deploymentError('Deploy attempt not found.', 404);
    const selected = selectedAttempt === run.run_attempt ? run : await cached(
      `attempt:${id}:${selectedAttempt}`, 60_000,
      () => github(repo, `runs/${id}/attempts/${selectedAttempt}`)
    );
    return { repo, run: selected, attempt: selectedAttempt };
  }

  async function detail(id, attempt) {
    const selected = await runData(id, attempt);
    const result = await cached(`jobs:${id}:${selected.attempt}`, 15_000, () =>
      github(selected.repo, `runs/${id}/attempts/${selected.attempt}/jobs?per_page=100`));
    return {
      run: runSummary(selected.run), jobsTruncated: result.total_count > result.jobs.length,
      jobs: result.jobs.map((job) => ({
        id: job.id, name: job.name, status: job.status, conclusion: job.conclusion,
        startedAt: job.started_at, completedAt: job.completed_at,
        steps: (job.steps || []).map((step) => ({
          number: step.number, name: step.name, status: step.status, conclusion: step.conclusion,
          startedAt: step.started_at, completedAt: step.completed_at,
        })),
      })),
    };
  }

  async function logs(id, jobId, attempt) {
    // Authorize the job against this workflow/run/attempt before following its log URL.
    const data = await detail(id, attempt);
    const job = data.jobs.find((item) => item.id === jobId);
    if (!job) throw deploymentError('Deploy job not found.', 404);
    if (job.status !== 'completed') return {
      available: false, text: '', truncated: false,
      notice: 'GitHub makes job logs available after the job completes. Step statuses refresh while it runs.',
    };
    return cached(`logs:${id}:${data.run.attempt}:${jobId}`, 60_000, async () => {
      const repo = await repository();
      let response = await github(repo, `jobs/${jobId}/logs`, { raw: true });
      if ([404, 410].includes(response.status)) return {
        available: false, text: '', truncated: false,
        notice: 'These logs have expired, were deleted, or are not available yet on GitHub.',
      };
      if (response.status === 302) {
        let location;
        try {
          location = new URL(response.headers.get('location'));
        } catch {
          throw deploymentError('GitHub returned an invalid log download location. Open the run on GitHub.');
        }
        const allowed = /(?:^|\.)(?:githubusercontent\.com|blob\.core\.windows\.net)$/.test(location.hostname);
        if (location.protocol !== 'https:' || location.username || location.password || !allowed)
          throw deploymentError('GitHub returned an unsupported log download location. Open the run on GitHub.');
        try {
          // Signed storage URL: never forward the GitHub Authorization header.
          response = await fetchImpl(location, { redirect: 'error', signal: AbortSignal.timeout(20_000) });
        } catch {
          throw deploymentError('The log download failed. Try again or open the run on GitHub.');
        }
        if (!response.ok) throw deploymentError('The log download is unavailable. Try again shortly.');
      }
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      let truncated = false;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(Buffer.from(value));
          size += value.length;
          if (size > LOG_LIMIT) {
            truncated = true;
            await reader.cancel();
            break;
          }
        }
      } catch {
        throw deploymentError('Reading deploy logs failed. Try again shortly.');
      } finally {
        reader.releaseLock();
      }
      let text = Buffer.concat(chunks).toString('utf8');
      if (truncated) text = text.slice(0, LOG_LIMIT).replace(/[^\n]*$/, '');
      // Render as text only, strip terminal control sequences, then apply the existing credential redactor.
      text = text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
      redactor.refreshSecrets();
      text = redactor.text(text).replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g, '[REDACTED]')
        .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?(?:-----END [^-]*PRIVATE KEY-----|$)/g, '[REDACTED PRIVATE KEY]');
      return { available: true, text, truncated };
    });
  }

  return { summary, detail, logs };
}

module.exports = { createDeploymentsService };
