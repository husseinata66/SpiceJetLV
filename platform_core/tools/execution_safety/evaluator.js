// Execution Safety — the deterministic evaluator.
//
// THE ONE QUESTION THIS FILE ANSWERS
//   Is this specific action authorized on this specific environment, against this type of data,
//   for this run?
//
// It answers it with plain data and plain arithmetic. Same input + same policy version => same
// decision, every time, forever. No model is consulted once the operation has been structurally
// classified; classification (what kind of action is this? whose record is it?) happens upstream in
// the calling Skill, and everything after that point is this function.
//
// WHAT THIS FILE MUST NEVER DO
//   - execute a browser action, click anything, or touch the application under test
//   - make a business decision, or decide what a test case means
//   - infer a human authorization that was not explicitly granted
//   - read, hold, or emit a credential
// It is a pure function over (policy, request, authorizations). Everything it returns is an
// explanation; nothing it returns is an action.
//
// GOVERNING PRINCIPLE: capability does not imply authorization. That the UI exposes Delete, that
// the credential can Approve, and that the automation exists to run are three facts about
// capability. None of them is a permission.
//
// Independence from Test Case governance is absolute and runs the other way too: no decision here
// can bypass `Review` or `Automation` (test-design-skill §6.3). `Allowed` never makes an unreviewed
// case executable — eligibility is checked first, by the Skill, and safety only narrows it.

'use strict';

const {
  DECISIONS, DECISION_SEVERITY, OWNERSHIP_WILDCARD, PolicyError,
  normalizeAction, normalizeOwnership, normalizeEnvironment,
  isMutating, categoryOf, coerceRule, assertValidPolicy,
} = require('./schema');

// ---------------------------------------------------------------------------------------------
// Precedence
// ---------------------------------------------------------------------------------------------

/** Scope ranks. A rule written against one entity beats one written against the whole platform. */
const SCOPE_RANK = { global: 0, module: 1, entity: 2 };

/** Action-axis ranks. Naming the action is more specific than naming its category. */
const ACTION_RANK = { wildcard: 0, category: 1, action: 2 };

/**
 * A rule's RISK TIER — how precisely it describes the risky thing.
 *
 * `DELETE` + `Shared` (tier 3) is a statement about a specific dangerous act. `mutation` + any
 * ownership (tier 1) is a broad convenience. Tier is what stops the second from silently
 * cancelling the first, and it is deliberately independent of scope: a module-scoped generality
 * must not outrank a global specificity (§16).
 */
function tierOf(rule) {
  return ACTION_RANK[rule.actionAxis] + (rule.ownershipAxis === 'exact' ? 1 : 0);
}

/** Total specificity, used only to break ties among rules of the same standing. */
function specificityOf(rule) {
  return SCOPE_RANK[rule.scope] * 100 + ACTION_RANK[rule.actionAxis] * 10
    + (rule.ownershipAxis === 'exact' ? 1 : 0);
}

// ---------------------------------------------------------------------------------------------
// Rule collection
// ---------------------------------------------------------------------------------------------

function pushRule(out, { table, ownership, scope, actionAxis, path, problems }) {
  if (!table) return;
  for (const key of [ownership, OWNERSHIP_WILDCARD]) {
    if (table[key] === undefined) continue;
    const { rule, problems: p } = coerceRule(table[key], `${path}.${key}`);
    if (p.length) problems.push(...p);
    if (!rule) continue;
    out.push({
      ...rule,
      scope,
      actionAxis,
      ownershipAxis: key === OWNERSHIP_WILDCARD ? 'wildcard' : 'exact',
      path: `${path}.${key}`,
    });
    return; // an exact ownership match wins over the wildcard within the same table
  }
}

/** Collects every rule in the policy that applies to this (module, entity, action, ownership). */
function collectApplicableRules(policy, { module: mod, entity, action, ownership }, problems) {
  const rules = [];
  const category = categoryOf(action);

  const addScope = (block, scope, prefix) => {
    if (!block) return;
    if (block.actions) {
      pushRule(rules, {
        table: block.actions[action], ownership, scope, actionAxis: 'action',
        path: `${prefix}.actions.${action}`, problems,
      });
    }
    if (block.categories && category) {
      pushRule(rules, {
        table: block.categories[category], ownership, scope, actionAxis: 'category',
        path: `${prefix}.categories.${category}`, problems,
      });
    }
  };

  // Global scope: defaults is the wildcard-action catch-all, plus global categories/actions.
  pushRule(rules, {
    table: policy.defaults, ownership, scope: 'global', actionAxis: 'wildcard',
    path: 'defaults', problems,
  });
  addScope(policy, 'global', 'policy');

  const moduleBlock = mod && policy.modules ? policy.modules[mod] : null;
  if (moduleBlock) {
    addScope(moduleBlock, 'module', `modules.${mod}`);
    const entityBlock = entity && moduleBlock.entities ? moduleBlock.entities[entity] : null;
    if (entityBlock) addScope(entityBlock, 'entity', `modules.${mod}.entities.${entity}`);
  }

  return rules;
}

// ---------------------------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------------------------

/**
 * Picks the winning rule from the applicable set.
 *
 * THE ALGORITHM, IN ORDER — each step returns immediately when it fires:
 *
 *   1. ABSOLUTE PROHIBITION WINS OUTRIGHT. Any applicable `Forbidden` marked `absolute` decides,
 *      and no run authorization can lift it. This is where financial and booking prohibitions live.
 *
 *   2. A PROHIBITION IS NEVER OVERRIDDEN BY A VAGUER PERMISSION. A `Forbidden` rule beats any rule
 *      of a STRICTLY LOWER risk tier, at any scope. This is the §16 guarantee:
 *          global   `DELETE` + `Shared`   = Forbidden      tier 3
 *          module   `mutation` + `*`      = Allowed        tier 1
 *      resolves to Forbidden. "Mutation is allowed in Agency" must not quietly mean "delete other
 *      people's Agency records is allowed in Agency".
 *
 *   3. THE NARROWEST SCOPE WINS. entity > module > global — an override written deliberately at a
 *      narrower scope is the author saying "here, specifically, the general rule does not hold".
 *
 *   4. WITHIN A SCOPE, THE HIGHEST TIER WINS. `UPDATE`+`Shared` beats `mutation`+`*`.
 *
 *   5. ON AN EXACT TIE, THE MOST RESTRICTIVE DECISION WINS (§17): Allowed < Approval Required <
 *      Forbidden. Two equally-specific rules that disagree are an authoring mistake, and the safe
 *      reading of a mistake is the strict one.
 *
 * Note what step 2 does NOT do: it does not make every `Forbidden` unliftable. An EQUALLY specific
 * module rule can still override a global prohibition, because that is a deliberate, targeted
 * statement by the policy author. Making a prohibition truly unliftable is what `absolute` is for,
 * and it is spelled out in the policy rather than emerging from precedence arithmetic.
 */
function resolveRule(rules) {
  if (!rules.length) return null;

  const absolutes = rules.filter((r) => r.absolute && r.decision === 'Forbidden');
  if (absolutes.length) {
    return absolutes.sort((a, b) => specificityOf(b) - specificityOf(a))[0];
  }

  const forbids = rules.filter((r) => r.decision === 'Forbidden');
  for (const f of forbids) {
    const outrankedByAll = rules.every((r) => r === f || tierOf(r) < tierOf(f) || r.decision === 'Forbidden');
    if (outrankedByAll) return f;
  }

  const sorted = rules.slice().sort((a, b) => {
    if (SCOPE_RANK[b.scope] !== SCOPE_RANK[a.scope]) return SCOPE_RANK[b.scope] - SCOPE_RANK[a.scope];
    if (tierOf(b) !== tierOf(a)) return tierOf(b) - tierOf(a);
    return DECISION_SEVERITY[b.decision] - DECISION_SEVERITY[a.decision];
  });
  return sorted[0];
}

// ---------------------------------------------------------------------------------------------
// Missing-policy fallback
// ---------------------------------------------------------------------------------------------

/**
 * What happens when no rule matched at all.
 *
 * A VALID POLICY NEVER REACHES THIS — the schema requires `defaults["*"]`, so every operation has
 * a catch-all. This exists for the case where a caller hands the evaluator a policy object it
 * assembled itself, and it fails safe rather than helpfully:
 *
 *     non-mutating (READ / SEARCH / DOWNLOAD)  → Approval Required
 *     everything else                          → Forbidden
 *
 * `Approval Required` rather than `Allowed` even for a read, because reaching this branch means the
 * policy is incomplete, and an incomplete policy is a reason to ask a human, not a reason to
 * proceed. "No rule found → Allowed" appears nowhere in this file.
 */
function fallbackRule(action) {
  return {
    decision: isMutating(action) ? 'Forbidden' : 'Approval Required',
    absolute: false,
    cleanupRequired: false,
    reason: isMutating(action)
      ? 'No rule in this policy covers the operation. A mutating action with no policy fails closed.'
      : 'No rule in this policy covers the operation. A read with no policy is escalated, not assumed safe.',
    scope: 'global',
    actionAxis: 'wildcard',
    ownershipAxis: 'wildcard',
    path: '(no matching rule — conservative fallback)',
    source: null,
  };
}

// ---------------------------------------------------------------------------------------------
// Run-scoped authorization
// ---------------------------------------------------------------------------------------------

/**
 * Finds the authorization that satisfies an `Approval Required` decision, if one exists.
 *
 * EVERY AXIS MUST MATCH, INCLUDING `runId`. An authorization is class-scoped per
 * (environment, module, action, ownership) FOR ONE RUN (HD-SAFETY-003). It carries to no other run,
 * environment, module, action, or ownership class — and the runId comparison is what makes
 * cross-run leakage impossible rather than merely discouraged.
 *
 * A revoked or expired authorization matches nothing.
 */
function findAuthorization(authorizations, req) {
  if (!Array.isArray(authorizations) || !req.runId) return null;
  return authorizations.find((a) => a
    && a.revoked !== true
    && String(a.runId) === String(req.runId)
    && String(a.environment) === String(req.environment)
    && String(a.module || '') === String(req.module || '')
    && String(a.action) === String(req.action)
    && String(a.ownership) === String(req.ownership)) || null;
}

// ---------------------------------------------------------------------------------------------
// evaluate()
// ---------------------------------------------------------------------------------------------

/**
 * Evaluates one operation against one policy.
 *
 * @param {object} req
 * @param {object}  req.policy          a validated policy document (see policyLoader.js)
 * @param {string}  req.action          e.g. 'UPDATE' — anything unrecognised becomes OTHER_MUTATION
 * @param {string}  [req.ownership]     e.g. 'Shared' — anything unrecognised becomes Unknown
 * @param {string}  [req.environment]   required for a decision — omitted means Unknown, never defaulted
 * @param {string}  [req.module]        module slug, for module-scoped overrides
 * @param {string}  [req.entity]        entity name, for entity-scoped overrides
 * @param {string}  [req.runId]         required for a run-scoped authorization to apply
 * @param {string}  [req.targetId]      the record being acted on — recorded, never used to decide
 * @param {object[]} [req.authorizations]
 * @returns {object} an explanation: decision, matchedRule, reason, scope, and every input echoed
 */
function evaluate(req) {
  if (!req || typeof req !== 'object') throw new PolicyError('evaluate() requires a request object.');
  const { policy } = req;
  if (!policy) throw new PolicyError('evaluate() requires a `policy`. Load one with policyLoader.js.');

  const warnings = [];

  const { action, recognised: actionOk } = normalizeAction(req.action);
  if (!actionOk) {
    warnings.push(`Unrecognised action "${req.action}" — evaluated as ${action}. An unknown verb is `
      + 'treated as a mutation, never as a read.');
  }

  const { ownership, recognised: ownershipOk } = normalizeOwnership(req.ownership);
  if (!ownershipOk) {
    warnings.push(`Ownership ${req.ownership === undefined || req.ownership === null || req.ownership === '' ? 'was not supplied' : `"${req.ownership}" is not a known class`} `
      + '— evaluated as Unknown. Unknown is never treated as SelfCreated.');
  }

  // Never defaulted (Phase 9.3, F-22): an omitted environment is Unknown, not the policy's own environment.
  // Taking the policy's environment would answer "is this allowed in Staging?" for a request that never
  // said where it runs — the silent assumption the environment gate exists to prevent.
  const omitted = req.environment === undefined || req.environment === null || String(req.environment).trim() === '';
  const requested = omitted ? '' : req.environment;
  const { environment, recognised: envOk } = normalizeEnvironment(requested, policy);
  if (omitted) {
    warnings.push(`No environment was supplied — evaluated as Unknown, never defaulted to the policy's environment (${policy.environment}). `
      + 'Name the environment explicitly; its identity comes from run configuration, never from the URL.');
  } else if (!envOk) {
    warnings.push(`Environment "${requested}" is not a known environment — evaluated as Unknown. `
      + 'Environment identity comes from run configuration, never from the URL.');
  }

  const base = {
    action,
    ownership,
    environment,
    module: req.module || null,
    entity: req.entity || null,
    runId: req.runId || null,
    targetId: req.targetId || null,
    policyId: policy.policyId,
    policyVersion: policy.policyVersion,
    mutating: isMutating(action),
    category: categoryOf(action),
  };

  // ENVIRONMENT GATE — a policy speaks only for the environment it names. Evaluating a QA request
  // against a Staging policy would answer a question nobody asked, so it refuses instead.
  if (environment !== policy.environment) {
    return {
      ...base,
      decision: 'Forbidden',
      matchedRule: '(environment mismatch — policy not authoritative here)',
      reason: `This policy governs ${policy.environment}; the request names ${environment}. `
        + 'No decision can be made for an environment this policy does not cover.',
      absolute: true,
      cleanupRequired: false,
      satisfiedBy: null,
      scope: { environment, module: base.module, entity: base.entity, action, ownership },
      warnings,
    };
  }

  const problems = [];
  const rules = collectApplicableRules(policy, { module: base.module, entity: base.entity, action, ownership }, problems);
  if (problems.length) warnings.push(...problems);

  const winner = resolveRule(rules) || fallbackRule(action);
  let decision = winner.decision;
  let satisfiedBy = null;

  // A run authorization can satisfy `Approval Required`. It can NEVER lift `Forbidden`
  // (HD-SAFETY-001: Forbidden is absolute at the policy layer). An authorization that tries is
  // reported, so an operator who wrote one sees why it did nothing rather than assuming it worked.
  const auth = findAuthorization(req.authorizations, { ...base });
  if (auth) {
    if (decision === 'Approval Required') {
      decision = 'Allowed';
      satisfiedBy = {
        authorizationId: auth.authorizationId || null,
        runId: auth.runId,
        approvedAt: auth.approvedAt || null,
        approvedBy: auth.approvedBy || null,
        scope: {
          environment: auth.environment, module: auth.module || null, action: auth.action, ownership: auth.ownership,
        },
      };
    } else if (decision === 'Forbidden') {
      warnings.push(`A run authorization (${auth.authorizationId || 'unnamed'}) matches this operation but `
        + 'cannot apply: the policy decision is Forbidden, and no run-scoped approval lifts a prohibition.');
    }
  }

  const reason = winner.reason || defaultReason(winner, { decision, action, ownership, environment, module: base.module });

  return {
    ...base,
    decision,
    matchedRule: winner.path,
    reason,
    absolute: winner.absolute === true,
    cleanupRequired: winner.cleanupRequired === true,
    satisfiedBy,
    scope: {
      environment, module: base.module, entity: base.entity, action, ownership,
    },
    warnings,
  };
}

/** A readable sentence for a rule that did not carry its own `reason`. */
function defaultReason(rule, { decision, action, ownership, environment, module: mod }) {
  const where = mod ? `${mod} / ${environment}` : environment;
  const own = ownership === 'Unknown' ? 'data of unproven ownership' : `${ownership} data`;
  if (decision === 'Allowed') return `${action} on ${own} is permitted on ${where}.`;
  if (decision === 'Forbidden') {
    return `${action} on ${own} is prohibited on ${where}${rule.absolute ? ' — absolutely; no run authorization lifts it' : ''}.`;
  }
  return `${action} on ${own} on ${where} requires an explicit, run-scoped human authorization.`;
}

/**
 * Renders one evaluation as the four-part explanation §22 requires. Never a bare boolean.
 * @param {object} result
 * @returns {string}
 */
function explain(result) {
  const lines = [
    `Decision: ${result.decision}`,
    '',
    'Matched Rule:',
    `  ${result.matchedRule}`,
    '',
    'Reason:',
    `  ${result.reason}`,
    '',
    'Scope:',
    `  environment: ${result.scope.environment}`,
    `  module:      ${result.scope.module || '(any)'}`,
    ...(result.scope.entity ? [`  entity:      ${result.scope.entity}`] : []),
    `  action:      ${result.scope.action}`,
    `  ownership:   ${result.scope.ownership}`,
  ];
  if (result.targetId) lines.push(`  target:      ${result.targetId}`);
  if (result.absolute) lines.push('', 'Absolute: yes — no other policy rule, at any scope, overrides this.');
  if (result.decision === 'Forbidden') {
    lines.push('', 'Forbidden is never liftable by a run-scoped authorization (HD-SAFETY-001).');
  }
  if (result.cleanupRequired) lines.push('', 'Cleanup: required — the original state must be restored after the action.');
  if (result.satisfiedBy) {
    lines.push('', `Satisfied by run authorization: ${result.satisfiedBy.authorizationId || '(unnamed)'} `
      + `(run ${result.satisfiedBy.runId}${result.satisfiedBy.approvedBy ? `, approved by ${result.satisfiedBy.approvedBy}` : ''})`);
  }
  if (result.warnings.length) {
    lines.push('', 'Warnings:');
    for (const w of result.warnings) lines.push(`  ! ${w}`);
  }
  return lines.join('\n');
}

module.exports = {
  evaluate,
  explain,
  findAuthorization,
  resolveRule,
  collectApplicableRules,
  tierOf,
  specificityOf,
  fallbackRule,
  SCOPE_RANK,
  ACTION_RANK,
  DECISIONS,
  assertValidPolicy,
};
