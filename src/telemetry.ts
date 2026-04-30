import { trace } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
	BatchSpanProcessor,
	ParentBasedSampler,
	TraceIdRatioBasedSampler,
} from "@opentelemetry/sdk-trace-base";
import { WebTracerProvider } from "@opentelemetry/sdk-trace-web";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { BASE_URL, resolveApiUrl } from "~/api/client";

let initialized = false;

const TELEMETRY_PATH = "/api/telemetry/traces";

export function initTelemetry() {
	if (initialized) return;
	initialized = true;

	const resource = resourceFromAttributes({
		[ATTR_SERVICE_NAME]: "smls-admin",
	});

	const exporter = new OTLPTraceExporter({
		url: resolveApiUrl(TELEMETRY_PATH),
	});

	const provider = new WebTracerProvider({
		resource,
		sampler: new ParentBasedSampler({
			root: new TraceIdRatioBasedSampler(import.meta.env.DEV ? 1 : 0.1),
		}),
		spanProcessors: [new BatchSpanProcessor(exporter)],
	});

	provider.register();

	const corsUrls: RegExp[] = [];
	if (BASE_URL) {
		corsUrls.push(new RegExp(`^${escapeRegExp(BASE_URL)}`));
	}

	registerInstrumentations({
		tracerProvider: provider,
		instrumentations: [
			new FetchInstrumentation({
				propagateTraceHeaderCorsUrls: corsUrls,
				ignoreUrls: [resolveApiUrl(TELEMETRY_PATH)],
			}),
		],
	});
}

/**
 * Returns the global tracer for creating custom spans.
 */
export function getTracer(name = "smls-admin") {
	return trace.getTracer(name);
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
