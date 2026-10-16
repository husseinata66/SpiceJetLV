// Approver name check (Phase 9.2, audit finding F-15).
//
// Every approval, rejection, attestation, authorization and confirmation the platform records names the
// human who gave it. This check refuses names that cannot be a person's: empty or whitespace, a single
// character, a placeholder ("n/a", "unknown", "tbd"), or an obviously agent- or system-shaped name
// ("Claude", "agent", "AI Assistant", "GPT-4", "Copilot", "bot", "system", "Run Manager").
//
// WHAT THIS IS NOT: authentication. A name is free text the caller types; this check only stops the
// obviously wrong ones. Proving WHO approved needs an identity provider, which the platform does not have
// and does not claim to have. Nothing here changes that; nothing here contacts any service.
//
// Leaf module (no dependencies), so the Module Manager, Execution Safety and lifecycle tools can use it
// without a dependency cycle.

// Whole-word tokens that only appear in agent / model / bot names.
const AGENT_WORDS = ['claude', 'anthropic', 'gpt', 'chatgpt', 'openai', 'codex', 'copilot', 'gemini', 'bard', 'llama', 'mistral',
  'llm', 'chatbot', 'bot', 'agent', 'assistant'];
// Whole-name values that are a placeholder or a system, never a person.
const NON_PERSON = ['system', 'automation', 'auto', 'automatic', 'platform', 'run manager', 'module manager', 'pipeline', 'script',
  'cli', 'tool', 'unknown', 'none', 'n/a', 'na', 'tbd', 'todo', 'anonymous', 'anon', 'null', 'undefined', 'nobody', 'someone',
  'ai', 'a.i.', 'ai model', 'the ai', 'model', '-', '—', '?', '...'];

class ApproverNameError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ApproverNameError';
    this.code = 'INVALID_APPROVER';
  }
}

/**
 * Why `name` cannot be recorded as a human approver, or null when it can.
 * @param {*} name
 * @returns {string|null}
 */
function approverProblem(name) {
  const raw = String(name ?? '').trim();
  if (!raw) return 'no approver was named';
  const letters = raw.replace(/[^\p{L}\p{N}]/gu, '');
  if (letters.length < 2) return `"${raw}" is not a name (fewer than two letters or digits)`;
  const lower = raw.toLowerCase().replace(/\s+/g, ' ');
  if (NON_PERSON.includes(lower)) return `"${raw}" is a placeholder or a system, not a person`;
  const words = lower.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const hit = words.find((w) => AGENT_WORDS.includes(w) || /^(gpt|claude|gemini|llama)\d/.test(w));
  if (hit) return `"${raw}" names an AI agent, model or bot ("${hit}") — an approval is recorded only for a named human`;
  return null;
}

/** Throws ApproverNameError when `name` cannot be recorded as a human approver; returns the trimmed name. */
function assertApproverName(name, what = 'approval') {
  const problem = approverProblem(name);
  if (problem) {
    throw new ApproverNameError(`${what} refused: ${problem}. Name the human who gave it. (A name is recorded, not authenticated — see run_manager.md, Phase 9.2.)`);
  }
  return String(name).trim();
}

module.exports = { ApproverNameError, approverProblem, assertApproverName, AGENT_WORDS, NON_PERSON };
