// WebAuthn browser API helpers
// Handles base64url <-> ArrayBuffer conversion needed between
// the server's JSON and the browser's navigator.credentials API.

export function isWebAuthnSupported(): boolean {
	return (
		typeof window !== "undefined" &&
		typeof window.PublicKeyCredential !== "undefined" &&
		typeof navigator.credentials?.create === "function"
	);
}

// base64url encode/decode (RFC 7515)
function bufferToBase64url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
	const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
	const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

// Server sends PublicKeyCredentialCreationOptions as JSON with base64url-encoded buffers.
// Convert to the format navigator.credentials.create() expects.
export function decodeCreationOptions(
	options: Record<string, unknown>,
): PublicKeyCredentialCreationOptions {
	const pk = options as Record<string, unknown>;
	return {
		...pk,
		challenge: base64urlToBuffer(pk.challenge as string),
		user: {
			...(pk.user as Record<string, unknown>),
			id: base64urlToBuffer((pk.user as Record<string, string>).id),
		} as PublicKeyCredentialUserEntity,
		excludeCredentials: ((pk.excludeCredentials as Array<Record<string, unknown>>) ?? []).map(
			(cred) => ({
				...cred,
				id: base64urlToBuffer(cred.id as string),
			}),
		) as PublicKeyCredentialDescriptor[],
	} as PublicKeyCredentialCreationOptions;
}

// Server sends PublicKeyCredentialRequestOptions as JSON with base64url-encoded buffers.
// Convert to the format navigator.credentials.get() expects.
export function decodeRequestOptions(
	options: Record<string, unknown>,
): PublicKeyCredentialRequestOptions {
	const pk = options as Record<string, unknown>;
	return {
		...pk,
		challenge: base64urlToBuffer(pk.challenge as string),
		allowCredentials: ((pk.allowCredentials as Array<Record<string, unknown>>) ?? []).map(
			(cred) => ({
				...cred,
				id: base64urlToBuffer(cred.id as string),
			}),
		) as PublicKeyCredentialDescriptor[],
	} as PublicKeyCredentialRequestOptions;
}

// Encode the credential returned by navigator.credentials.create() to JSON for the server.
export function encodeRegistrationCredential(
	credential: PublicKeyCredential,
): Record<string, unknown> {
	const response = credential.response as AuthenticatorAttestationResponse;
	return {
		id: credential.id,
		rawId: bufferToBase64url(credential.rawId),
		type: credential.type,
		response: {
			attestationObject: bufferToBase64url(response.attestationObject),
			clientDataJSON: bufferToBase64url(response.clientDataJSON),
		},
	};
}

// Encode the credential returned by navigator.credentials.get() to JSON for the server.
export function encodeAuthenticationCredential(
	credential: PublicKeyCredential,
): Record<string, unknown> {
	const response = credential.response as AuthenticatorAssertionResponse;
	return {
		id: credential.id,
		rawId: bufferToBase64url(credential.rawId),
		type: credential.type,
		response: {
			authenticatorData: bufferToBase64url(response.authenticatorData),
			clientDataJSON: bufferToBase64url(response.clientDataJSON),
			signature: bufferToBase64url(response.signature),
			userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : null,
		},
	};
}

// webauthn-rs serializes CreationChallengeResponse / RequestChallengeResponse
// as { publicKey: { challenge, user, rp, ... } }. Unwrap if present.
function unwrapPublicKey(json: Record<string, unknown>): Record<string, unknown> {
	if ("publicKey" in json && typeof json.publicKey === "object" && json.publicKey !== null) {
		return json.publicKey as Record<string, unknown>;
	}
	return json;
}

// High-level: call navigator.credentials.create() with server options
export async function createPasskey(
	creationOptionsJson: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	const publicKey = decodeCreationOptions(unwrapPublicKey(creationOptionsJson));
	const credential = (await navigator.credentials.create({
		publicKey,
	})) as PublicKeyCredential | null;
	if (!credential) throw new Error("Passkey creation was cancelled.");
	return encodeRegistrationCredential(credential);
}

// High-level: call navigator.credentials.get() with server options
export async function authenticatePasskey(
	requestOptionsJson: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	const publicKey = decodeRequestOptions(unwrapPublicKey(requestOptionsJson));
	const credential = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null;
	if (!credential) throw new Error("Passkey authentication was cancelled.");
	return encodeAuthenticationCredential(credential);
}
