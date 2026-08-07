# AGENTS.md

## Purpose

Make the smallest correct change while preserving architecture, type safety,
tests, security, and sound repository conventions.

Before editing:

- inspect the repository structure and nearby code;
- read nested `AGENTS.md` or `AGENTS.override.md` files;
- inspect package scripts, TypeScript, lint, test, and framework configuration;
- use the existing package manager and installed libraries;
- search for existing implementations before creating new abstractions.

The closest applicable instruction file takes precedence.

## General engineering rules

- Organize code by business capability.
- Keep one responsibility per function and module.
- Functions should normally be 4–20 lines.
- Files should remain under 500 lines, excluding generated files.
- Split only by meaningful responsibility; do not create artificial helpers.
- Prefer early returns and no more than two reasonable nesting levels.
- Use specific, searchable names. Avoid vague names such as `data`, `handler`,
  `Manager`, `process`, `item`, and `info`.
- Prefer names that produce fewer than five unrelated search results.
- Keep side effects at system boundaries.
- Avoid meaningful duplication, but do not create premature abstractions.
- Make the smallest coherent change; avoid unrelated refactors.

## TypeScript

- Do not introduce `any`, implicit untyped parameters, unsafe double casts, or
  `@ts-ignore`.
- Use `unknown`, validation, narrowing, generics, and concrete types.
- Type public boundaries explicitly.
- Use `@ts-expect-error` only for an unavoidable one-line compatibility issue,
  with a reason.
- Exception messages must include the offending value when safe and the expected
  format, range, shape, or state.
- Never include secrets, passwords, tokens, or sensitive personal data in errors
  or logs.

## Comments

- Preserve valid existing comments during refactors.
- Remove comments only when false, obsolete, or harmful.
- Write WHY, constraints, provenance, or external limitations—not WHAT.
- Do not leave commented-out code.
- Add a short docstring with intent and one concise example to public exported
  functions when their contract is not already obvious from naming and types.

## Tests and completion

- New behavior and bug fixes require automated tests.
- Bug fixes require a regression test when technically possible.
- Update or rewrite affected tests when behavior changes.
- Never delete, skip, or weaken tests merely to make CI pass.
- Unit tests stay near source by default.
- Integration tests belong in `tests/integration/`.
- E2E tests belong in `tests/e2e/`.
- Never use production or development data in automated tests.

After a coherent change, run the repository's applicable:

```bash
<package-manager> run lint
<package-manager> run typecheck
<package-manager> test
<package-manager> run build
```

Also run relevant integration and E2E suites. Do not claim a check passed unless
it was actually executed successfully.

Automated repository configuration remains authoritative, including ESLint,
TypeScript, Vitest, dependency-boundary rules, and CI.

## Frontend architecture

Apply these rules to React, Vue, Next.js, Nuxt, or similar frameworks while
respecting mandatory framework routing and special-file conventions.

Organize business code under:

```text
src/features/<feature>/
```

Preferred dependency direction:

```text
app → features → shared
```

Rules:

- `app` owns router, providers, layouts, bootstrap, and global infrastructure.
- A feature owns its API calls, components, hooks/composables, schemas, state,
  types, views/pages, utilities, and tests.
- `shared` contains only domain-agnostic UI and utilities used by multiple
  features.
- `shared` must not import a feature.
- Generic HTTP transport belongs in `shared/api`.
- Endpoint-specific API functions belong to their feature.
- Keep local UI state local.
- Use the project query/cache solution for server state.
- Use global stores only for genuinely cross-cutting client state.
- Avoid duplicated sources of truth.
- Components should expose accessible, user-observable behavior.
- Do not scatter raw network calls through page or presentation components.
- In Next.js, respect server/client boundaries and keep secrets, database access,
  and server-only dependencies out of client code.