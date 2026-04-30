## Do

- Use bun instead of npm
- Generate a new client with `bun run generate:api` if types are missing
- Use [solid-ui](https://www.solid-ui.com/) for UI components (shadcn-style, built on Kobalte + Tailwind)
- Use `.env` files for configuration: `.env.development` (local dev), `.env.production` (prod build), `.env.local` for personal overrides (gitignored)
- Default to small, focused components and modules.
  Avoid "god components." Extract logic into small files and keep responsibilities narrow.
- When suggesting a new dependency, first check that there isn't an alternative available that has a smaller impact on bundle size. Use bundlephobia.com as a resource.
- **Bundle size and tree-shaking are a priority.** Prefer granular imports (e.g. `@kobalte/core/button` over `@kobalte/core`), avoid importing entire libraries, and use `lazy()` for route-level code splitting. Run `bunx vite-bundle-visualizer` to check impact when adding dependencies.
- Disable all buttons on submit to prevent double-presses

### SolidJS Reactivity Best Practices

- **Never destructure props** - Always use `props.foo` to maintain reactivity
- **Use `createMemo` for derived values** - Especially when the value is accessed multiple times
- **Avoid `createEffect` for state synchronization** - Derive state directly instead
- **Use `<Show>` and `<For>` components** - Prefer these over `&&` and `.map()` in JSX
- **Don't initialize signals with prop values** - Use `createEffect` to sync when needed (see examples in `locations.tsx` and `team.tsx`)

## Don't

- Don't proceed to make changes before asking clarifying questions, if instructions are unclear
- Don't use legacy (pre-2025) tools
- Don't hard code colors
- Don't use `div`s if we have a component already
- Don't return new object literals or inline maps/arrays from reactive declarations when exporting shared state. This can cause unnecessary invalidations and effects to re-run.
- Don't add cookie banners or consent dialogs. We only use session cookies for authentication (no analytics, tracking, or third-party cookies), so no consent is required under GDPR/ePrivacy.


## Before finishing a change

Always run these commands and ensure they pass with no warnings:

1. **`bun run fix`** - Auto-fix linting issues and format code (Biome + Oxlint)
2. **`bun run verify`** - Full verification (linting + formatting + type checking)
3. **`bun run check`** - TypeScript type checking only

### Linting & Formatting

We use **Biome** (formatter + linter) and **Oxlint** (additional linter) for blazing-fast code quality checks (~100ms total).

**Quick commands:**
- `bun run lint` - Run all linters (Biome + Oxlint + SolidJS pattern checker)
- `bun run format` - Format all code with Biome
- `bun run lint:solid` - Run custom SolidJS anti-pattern checker

**Pre-commit hook:** Automatically runs SolidJS checker, formatter, and linter before commits.

**See `LINTING.md`** for detailed documentation on rules, configuration, and best practices.
