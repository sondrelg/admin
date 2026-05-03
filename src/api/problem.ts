type ProblemDetail = {
	detail?: string;
	title?: string;
	message?: string;
	error?: string;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
	if (typeof value !== "object" || value === null) return;
	return value as Record<string, unknown>;
}

export function getProblemDetailMessage(value: unknown): string | undefined {
	const record = asRecord(value);
	if (!record) return;

	const problem = record as ProblemDetail;
	if (typeof problem.detail === "string" && problem.detail.trim()) return problem.detail;
	if (typeof problem.message === "string" && problem.message.trim()) return problem.message;
	if (typeof problem.error === "string" && problem.error.trim()) return problem.error;
	if (typeof problem.title === "string" && problem.title.trim()) return problem.title;
}
