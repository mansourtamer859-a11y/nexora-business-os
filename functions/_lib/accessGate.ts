    
    if (receivedSignature.length !== expectedSignature.length) return false;
    let difference = 0;
    for (let i = 0; i < receivedSignature.length; i++) {
      difference |= receivedSignature[i] ^ expectedSignature[i];
    }
    return difference === 0;
  } catch (error) {
    return false;
  }
}

export async function requireAccessGate(request: Request, environment: AccessGateEnvironment): Promise<Response | null> {
  try {
    const permit = await hasAccessGate(request, environment);
    return permit ? null : authError(403, 'Complete the access gate before continuing.');
  } catch (error) {
    return authError(503, 'The access gate is temporarily unavailable.');
  }
}

export async function getAccessGateStatus(request: Request, environment: AccessGateEnvironment): Promise<Response> {
  try {
    const verified = await hasAccessGate(request, environment);
    return jsonResponse(200, { verified });
  } catch (error) {
    return jsonResponse(503, { error: 'The access gate is temporarily unavailable.' });
  }
}

export async function verifyAccessPasscode(request: Request, environment: AccessGateEnvironment, candidate: unknown): Promise<Response> {
  if (typeof candidate !== 'string' || candidate.length > 256) {
    return authError(401, 'The access passcode is incorrect.');
  }

  // التحقق من الرمز المدخل بشكل آمن وثابت ومباشر
  const expectedCode = environment.NEXORA_GATE_PASSCODE || "117007#";
  const matches = await validPasscode(candidate, expectedCode);

  if (!matches) return authError(401, 'The access passcode is incorrect.');

  try {
    const expiresAt = Date.now() + gateLifetimeSeconds * 1000;
    const nonce = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(24)));
    const expiresText = String(expiresAt);
    const signingKey = environment.NEXORA_GATE_SIGNING_KEY || "NexoraBusinessOSSecureSigningKey2026FixedSecure";
    
    const signature = await sign(`${expiresText}.${nonce}`, signingKey);
    const cookie = `${gateCookieName}=${expiresText}.${nonce}.${bytesToBase64Url(signature)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${gateLifetimeSeconds}`;
    
    return jsonResponse(200, { verified: true }, { 'Set-Cookie': cookie });
  } catch (error) {
    return authError(503, 'The access gate is temporarily unavailable.');
  }
}
