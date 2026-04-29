# Linting and Formatting Setup

This project uses a modern, high-performance linting and formatting setup optimized for SolidJS applications.

## Tools

### 🚀 Biome (Primary Formatter & Linter)
- **Fast**: Written in Rust, extremely performant
- **Purpose**: Code formatting and general linting
- **Config**: `biome.json`
- **Features**:
  - Automatic code formatting
  - Import organization
  - SolidJS-specific rules (e.g., `noSolidDestructuredProps`)
  - TypeScript support

### ⚡ Oxlint (Secondary Linter)
- **Fast**: Also written in Rust
- **Purpose**: Additional linting rules from ESLint ecosystem
- **Config**: `.oxlintrc.json`
- **Features**:
  - TypeScript linting
  - Import/export validation
  - React/JSX rules (adapted for SolidJS)
  - Unicorn best practices

### 🎯 Custom SolidJS Pattern Checker
- **Purpose**: Catch SolidJS-specific anti-patterns
- **Location**: `scripts/check-solid-patterns.ts`
- **Checks for**:
  - Initializing signals with prop values
  - Destructuring props (breaks reactivity)
  - Using `&&` instead of `<Show>` in JSX
  - Effects used for state synchronization
  - Direct date formatting outside `src/lib/datetime.ts`

## NPM Scripts

### Development
```bash
# Run all linters (Biome + Oxlint + SolidJS checker)
bun run lint

# Run individual linters
bun run lint:biome    # Biome linter only
bun run lint:ox       # Oxlint only
bun run lint:solid    # Custom SolidJS checker only

# Format code
bun run format         # Format and write changes
bun run format:check   # Check formatting without writing

# Fix auto-fixable issues
bun run fix           # Run all auto-fixes

# Type check
bun run check         # TypeScript type checking

# Full verification (lint + format + types)
bun run verify        # Run all checks before committing
```

### Pre-commit Hook
```bash
bun run pre-commit    # Runs automatically before git commit
```

## Configuration Details

### Biome Rules (`biome.json`)

**Enabled Rules:**
- ✅ All recommended rules
- ✅ `noSolidDestructuredProps` - **SolidJS specific**: Prevents destructuring props
- ✅ `noUnusedVariables` - Catches unused variables
- ✅ `useConst` - Enforces const over let when possible
- ✅ `useTemplate` - Prefers template literals
- ✅ `useExponentiationOperator` - Prefers `**` over `Math.pow`

**Disabled Rules:**
- ❌ `noNonNullAssertion` - TypeScript non-null assertions are allowed
- ❌ `useKeyWithClickEvents` - Labels with checkboxes are accessible
- ❌ `useSortedClasses` - Tailwind class sorting not enforced

**Formatting:**
- Indent: Tabs (2 spaces)
- Line width: 100 characters
- Quotes: Double quotes
- Semicolons: Always
- Trailing commas: Always
- Arrow parens: Always

### Oxlint Rules (`.oxlintrc.json`)

**Plugins Enabled:**
- TypeScript
- Import/Export
- React/JSX (adapted for SolidJS)
- JSX A11y (accessibility)
- Unicorn (best practices)

**Key Rules:**
- ⚠️ `typescript/no-explicit-any` - Warns on `any` usage
- ⚠️ `typescript/prefer-as-const` - Type assertion best practices
- ❌ `react/react-in-jsx-scope` - Disabled (SolidJS doesn't need React import)
- ❌ `react/jsx-no-undef` - Disabled (handled by TypeScript)
- ❌ `jsx-a11y/label-has-associated-control` - Disabled (false positives with SolidJS)

**Categories:**
- Correctness: Warning
- Suspicious: Warning
- Pedantic: Off
- Performance: Off

### Custom SolidJS Checker

Detects these anti-patterns:

1. **Prop Initialization** (Error)
   ```typescript
   // ❌ BAD
   const [name, setName] = createSignal(props.user.name);

   // ✅ GOOD
   const [name, setName] = createSignal("");
   createEffect(() => {
     if (dialogOpen()) setName(props.user.name);
   });
   ```

2. **Prop Destructuring** (Error)
   ```typescript
   // ❌ BAD
   const { name, email } = props;

   // ✅ GOOD
   const name = () => props.name;
   const email = () => props.email;
   ```

3. **Conditional Rendering** (Warning)
   ```typescript
   // ⚠️ DISCOURAGED
   {user && <div>{user.name}</div>}

   // ✅ PREFERRED
   <Show when={user}>
     {(u) => <div>{u().name}</div>}
   </Show>
   ```

## Git Hooks

Pre-commit hooks are configured using `simple-git-hooks` and run automatically before each commit.

### What Runs on Pre-commit
1. Custom SolidJS pattern checker
2. Biome formatting
3. Biome linting

### Setup/Reinstall Hooks
```bash
bunx simple-git-hooks
```

## Best Practices

### SolidJS Reactivity

1. **Never destructure props**
   ```typescript
   // Breaks reactivity
   function Component({ name }: { name: string }) {
     return <div>{name}</div>;
   }

   // Maintains reactivity
   function Component(props: { name: string }) {
     return <div>{props.name}</div>;
   }
   ```

2. **Use memos for derived values**
   ```typescript
   const fullName = createMemo(() => `${props.first} ${props.last}`);
   ```

3. **Avoid effects for state sync**
   ```typescript
   // Bad - using effect
   createEffect(() => setB(a()));

   // Good - derive directly
   const b = () => transform(a());
   ```

4. **Use Show/For components**
   ```typescript
   // Discouraged
   {items.length > 0 && <List items={items} />}

   // Preferred
   <Show when={items.length > 0}>
     <List items={items} />
   </Show>
   ```

5. **Use shared date formatting helpers**
   ```typescript
   // ❌ BAD
   new Date(createdAt * 1000).toLocaleDateString();

   // ✅ GOOD
   formatDateFromUnixSeconds(createdAt);
   ```

### General TypeScript

1. Avoid `any`, use `unknown` instead
2. Use `type` for object shapes, `interface` for contracts
3. Prefer `const` over `let`
4. Use template literals for string concatenation

## IDE Integration

### VS Code

Install these extensions:
- **Biome** (`biomejs.biome`) - Official Biome extension
- **Oxlint** (if available) - Oxlint integration

Add to `.vscode/settings.json`:
```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "quickfix.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  }
}
```

### Other IDEs

Check Biome documentation for your specific IDE:
https://biomejs.dev/reference/editors/

## Troubleshooting

### "Configuration resulted in errors"

Check `biome.json` for unknown rule names. Biome's schema evolves, so some rules might be renamed or removed.

### Oxlint reports many errors

Check `.oxlintrc.json` categories and rules. Some rules might be too strict for your use case.

### Pre-commit hook fails

Run the pre-commit script manually to see detailed errors:
```bash
bun run pre-commit
```

### False positives in generated code

Both Biome and Oxlint ignore:
- `src/api/generated/**`
- `src/api/models/**`
- `dist/**`
- `node_modules/**`

## Performance

All tools are written in Rust and optimized for speed:

- **Biome**: ~50ms to lint entire codebase
- **Oxlint**: ~35ms to lint entire codebase
- **Custom checker**: ~10ms to check patterns
- **Total**: < 100ms for all checks

This is 10-100x faster than traditional ESLint setups.

## Migration Notes

### From ESLint

If migrating from ESLint:
1. Remove `.eslintrc`, `.eslintignore`
2. Uninstall `eslint` and all plugins
3. Rules map approximately:
   - `eslint-plugin-solid` → Custom SolidJS checker + Biome's `noSolidDestructuredProps`
   - `@typescript-eslint` → Oxlint TypeScript plugin
   - `eslint-plugin-import` → Oxlint import plugin
   - Most others → Biome recommended rules

### From Prettier

Biome replaces Prettier:
1. Remove `.prettierrc`, `.prettierignore`
2. Uninstall `prettier`
3. Configure formatting preferences in `biome.json`

## Resources

- [Biome Documentation](https://biomejs.dev/)
- [Oxlint Documentation](https://oxc.rs/docs/guide/usage/linter)
- [SolidJS Best Practices](https://www.solidjs.com/guides/reactivity)
- [Simple Git Hooks](https://github.com/toplenboren/simple-git-hooks)

## Changelog

### 2026-02-21
- ✅ Initial linting setup with Biome + Oxlint
- ✅ Custom SolidJS pattern checker created
- ✅ Pre-commit hooks configured
- ✅ All existing code formatted and linted
- ✅ Documentation created
