#!/usr/bin/env bun
/**
 * Custom SolidJS Pattern Checker
 *
 * Checks for common SolidJS anti-patterns that aren't caught by general linters.
 * Based on SolidJS best practices review completed on 2026-02-21.
 */

import * as fs from "fs";
import * as path from "path";
import { Glob } from "bun";

interface Issue {
	file: string;
	line: number;
	column: number;
	rule: string;
	message: string;
	severity: "error" | "warning";
}

const issues: Issue[] = [];

// Pattern: createSignal(props.something) - initializing signal with prop value
const PROP_INIT_PATTERN = /createSignal\s*\(\s*props\.[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*\s*\)/g;

// Pattern: const {foo} = props - destructuring props
const PROP_DESTRUCTURE_PATTERN = /const\s+\{[^}]+\}\s*=\s*props(?:[,;]|\s)/g;

// Pattern: Using && in JSX (should use <Show> instead)
const JSX_AND_PATTERN = /\{[^}]*&&\s*</g;

// Pattern: createEffect for state sync (basic detection - might have false positives)
const EFFECT_STATE_SYNC_PATTERN = /createEffect\s*\([^)]*\)\s*=>\s*\{[^}]*set[A-Z][a-zA-Z]*\(/g;

// Date formatting must go through src/lib/datetime.ts for locale consistency.
const DATE_TO_LOCALE_DATE_PATTERN = /\.toLocaleDateString\s*\(/g;
const DATE_TO_LOCALE_TIME_PATTERN = /\.toLocaleTimeString\s*\(/g;
const DATE_TO_LOCALE_STRING_PATTERN = /new\s+Date\s*\([^)]*\)\s*\.toLocaleString\s*\(/g;
const DATE_INTL_FORMAT_PATTERN = /new\s+Intl\.DateTimeFormat\s*\(/g;

async function checkFile(filePath: string): Promise<void> {
	if (filePath.endsWith("/src/lib/datetime.ts")) {
		return;
	}

	const content = fs.readFileSync(filePath, "utf-8");
	const lines = content.split("\n");

	// Check for prop initialization
	let match: RegExpExecArray | null;

	while ((match = PROP_INIT_PATTERN.exec(content)) !== null) {
		const lineNum = content.substring(0, match.index).split("\n").length;
		issues.push({
			file: filePath,
			line: lineNum,
			column: match.index - content.lastIndexOf("\n", match.index),
			rule: "solid/no-prop-init",
			message: "Avoid initializing signals with prop values directly. Use createEffect to sync when needed.",
			severity: "error",
		});
	}

	// Reset regex
	PROP_INIT_PATTERN.lastIndex = 0;

	// Check for prop destructuring
	while ((match = PROP_DESTRUCTURE_PATTERN.exec(content)) !== null) {
		const lineNum = content.substring(0, match.index).split("\n").length;
		// Skip false positives in comments
		const lineContent = lines[lineNum - 1];
		if (lineContent && !lineContent.trim().startsWith("//")) {
			issues.push({
				file: filePath,
				line: lineNum,
				column: match.index - content.lastIndexOf("\n", match.index),
				rule: "solid/no-destructure",
				message: "Avoid destructuring props. Use props.foo to maintain reactivity.",
				severity: "error",
			});
		}
	}

	PROP_DESTRUCTURE_PATTERN.lastIndex = 0;

	// Check for && in JSX
	while ((match = JSX_AND_PATTERN.exec(content)) !== null) {
		const lineNum = content.substring(0, match.index).split("\n").length;
		const lineContent = lines[lineNum - 1];
		// Only warn if it looks like a conditional render
		if (lineContent && !lineContent.includes("<Show")) {
			issues.push({
				file: filePath,
				line: lineNum,
				column: match.index - content.lastIndexOf("\n", match.index),
				rule: "solid/prefer-show",
				message: "Prefer <Show> component over && for conditional rendering in SolidJS.",
				severity: "warning",
			});
		}
	}

	JSX_AND_PATTERN.lastIndex = 0;

	// Check for direct date formatting (should use src/lib/datetime.ts helpers)
	while ((match = DATE_TO_LOCALE_DATE_PATTERN.exec(content)) !== null) {
		const lineNum = content.substring(0, match.index).split("\n").length;
		issues.push({
			file: filePath,
			line: lineNum,
			column: match.index - content.lastIndexOf("\n", match.index),
			rule: "dates/use-shared-formatter",
			message: "Use src/lib/datetime.ts helpers instead of toLocaleDateString.",
			severity: "error",
		});
	}
	DATE_TO_LOCALE_DATE_PATTERN.lastIndex = 0;

	while ((match = DATE_TO_LOCALE_TIME_PATTERN.exec(content)) !== null) {
		const lineNum = content.substring(0, match.index).split("\n").length;
		issues.push({
			file: filePath,
			line: lineNum,
			column: match.index - content.lastIndexOf("\n", match.index),
			rule: "dates/use-shared-formatter",
			message: "Use src/lib/datetime.ts helpers instead of toLocaleTimeString.",
			severity: "error",
		});
	}
	DATE_TO_LOCALE_TIME_PATTERN.lastIndex = 0;

	while ((match = DATE_TO_LOCALE_STRING_PATTERN.exec(content)) !== null) {
		const lineNum = content.substring(0, match.index).split("\n").length;
		issues.push({
			file: filePath,
			line: lineNum,
			column: match.index - content.lastIndexOf("\n", match.index),
			rule: "dates/use-shared-formatter",
			message: "Use src/lib/datetime.ts helpers instead of Date#toLocaleString.",
			severity: "error",
		});
	}
	DATE_TO_LOCALE_STRING_PATTERN.lastIndex = 0;

	while ((match = DATE_INTL_FORMAT_PATTERN.exec(content)) !== null) {
		const lineNum = content.substring(0, match.index).split("\n").length;
		issues.push({
			file: filePath,
			line: lineNum,
			column: match.index - content.lastIndexOf("\n", match.index),
			rule: "dates/use-shared-formatter",
			message: "Use src/lib/datetime.ts helpers instead of Intl.DateTimeFormat directly.",
			severity: "error",
		});
	}
	DATE_INTL_FORMAT_PATTERN.lastIndex = 0;
}

async function main() {
	console.log("🔍 Checking SolidJS patterns...\n");

	// Find all TypeScript/TSX files in src, excluding generated code
	const glob = new Glob("src/**/*.{ts,tsx}");
	const files: string[] = [];

	for await (const file of glob.scan({ cwd: process.cwd(), absolute: true })) {
		// Skip generated code and type definitions
		if (
			file.includes("/api/generated/") ||
			file.includes("/api/models/") ||
			file.endsWith(".d.ts") ||
			file.includes("/node_modules/")
		) {
			continue;
		}
		files.push(file);
	}

	console.log(`Found ${files.length} files to check\n`);

	for (const file of files) {
		await checkFile(file);
	}

	if (issues.length === 0) {
		console.log("✅ No SolidJS pattern issues found!\n");
		process.exit(0);
	}

	// Group issues by file
	const issuesByFile = issues.reduce((acc, issue) => {
		if (!acc[issue.file]) {
			acc[issue.file] = [];
		}
		acc[issue.file].push(issue);
		return acc;
	}, {} as Record<string, Issue[]>);

	// Print issues
	const errorCount = issues.filter((i) => i.severity === "error").length;
	const warningCount = issues.filter((i) => i.severity === "warning").length;

	console.log(`Found ${errorCount} errors and ${warningCount} warnings:\n`);

	for (const [file, fileIssues] of Object.entries(issuesByFile)) {
		const relPath = path.relative(process.cwd(), file);
		console.log(`\n${relPath}:`);

		for (const issue of fileIssues) {
			const icon = issue.severity === "error" ? "❌" : "⚠️";
			console.log(`  ${icon} ${issue.line}:${issue.column} - ${issue.message} (${issue.rule})`);
		}
	}

	console.log("");

	// Exit with error code if there are errors
	if (errorCount > 0) {
		process.exit(1);
	}
}

main().catch((error) => {
	console.error("Error running SolidJS pattern checker:", error);
	process.exit(1);
});
