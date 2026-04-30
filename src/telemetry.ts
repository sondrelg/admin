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

const TELEMETRY_URL = "/api/telemetry/traces";

export function initTelemetry() {
	if (initialized) return;
	initialized = true;

	const resource = resourceFromAttributes({
		[ATTR_SERVICE_NAME]: "smls-admin",
	});

	const exporter = new OTLPTraceExporter({
		url: resolveApiUrl(TELEMETRY_URL),
	});

	const provider = new WebTracerProvider({
		resource,
		sampler: new ParentBasedSampler({
			root: new TraceIdRatioBasedSampler(1),
		}),
		spanProcessors: [new BatchSpanProcessor(exporter)],
	});

	provider.register();

	registerInstrumentations({
		tracerProvider: provider,
		instrumentations: [
			new FetchInstrumentation({
				propagateTraceHeaderCorsUrls: [new RegExp(`^${escapeRegExp(BASE_URL)}`)],
				ignoreUrls: [resolveApiUrl(TELEMETRY_URL)],
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
