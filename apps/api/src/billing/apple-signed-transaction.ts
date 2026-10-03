import { createVerify, X509Certificate } from 'crypto';

/**
 * Apple Root CA - G3, the public root StoreKit 2 signed transactions chain to.
 * https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
 */
export const APPLE_ROOT_CA_G3_PEM = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4
at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM
6BgD56KyKA==
-----END CERTIFICATE-----`;

export const APPLE_ROOT_CA_G3_SHA256 =
  '63343abfb89a6a03ebb57e9b3f5fa7be7c4f5c756f3017b3a8c488c3653e9179';

export type AppleTransaction = {
  transactionId: string;
  originalTransactionId: string;
  bundleId: string;
  productId: string;
  environment: string;
  expiresDate: number | null;
  revocationDate: number | null;
};

export class AppleTransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppleTransactionError';
  }
}

function decodeBase64Url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(
    input.replace(/-/g, '+').replace(/_/g, '/') + pad,
    'base64',
  );
}

/** StoreKit JWS signatures are raw R||S. Node verifies ECDSA as DER. */
function rawEcSignatureToDer(raw: Buffer): Buffer {
  if (raw.length !== 64) {
    throw new AppleTransactionError('Invalid signed transaction');
  }
  const encode = (part: Buffer) => {
    let start = 0;
    while (start < part.length - 1 && part[start] === 0) start += 1;
    let value = part.subarray(start);
    if (value[0] & 0x80) {
      value = Buffer.concat([Buffer.from([0x00]), value]);
    }
    return Buffer.concat([Buffer.from([0x02, value.length]), value]);
  };
  const body = Buffer.concat([
    encode(raw.subarray(0, 32)),
    encode(raw.subarray(32)),
  ]);
  return Buffer.concat([Buffer.from([0x30, body.length]), body]);
}

function certificateIsCurrent(cert: X509Certificate, now: number): boolean {
  return now >= Date.parse(cert.validFrom) && now <= Date.parse(cert.validTo);
}

/**
 * Verify a StoreKit 2 signed transaction. The certificate chain must end at
 * the supplied root. Production calls use Apple Root CA - G3.
 */
export function verifyAppleSignedTransaction(
  jws: string,
  rootPem: string = APPLE_ROOT_CA_G3_PEM,
): AppleTransaction {
  const parts = jws.split('.');
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw new AppleTransactionError('Invalid signed transaction');
  }

  let header: { alg?: string; x5c?: unknown };
  try {
    header = JSON.parse(decodeBase64Url(parts[0]).toString('utf8')) as {
      alg?: string;
      x5c?: unknown;
    };
  } catch {
    throw new AppleTransactionError('Invalid signed transaction');
  }
  if (
    header.alg !== 'ES256' ||
    !Array.isArray(header.x5c) ||
    header.x5c.length < 2 ||
    header.x5c.some((item) => typeof item !== 'string')
  ) {
    throw new AppleTransactionError('Invalid signed transaction');
  }

  let certs: X509Certificate[];
  let root: X509Certificate;
  try {
    certs = (header.x5c as string[]).map(
      (der) => new X509Certificate(Buffer.from(der, 'base64')),
    );
    root = new X509Certificate(rootPem);
  } catch {
    throw new AppleTransactionError('Invalid signed transaction');
  }

  if (rootPem === APPLE_ROOT_CA_G3_PEM) {
    const fingerprint = root.fingerprint256.replace(/:/g, '').toLowerCase();
    if (fingerprint !== APPLE_ROOT_CA_G3_SHA256) {
      throw new AppleTransactionError('Invalid signed transaction');
    }
  }

  const now = Date.now();
  if (
    !certificateIsCurrent(root, now) ||
    certs.some((cert) => !certificateIsCurrent(cert, now))
  ) {
    throw new AppleTransactionError('Invalid signed transaction');
  }
  for (let i = 0; i < certs.length - 1; i += 1) {
    if (!certs[i].verify(certs[i + 1].publicKey)) {
      throw new AppleTransactionError('Invalid signed transaction');
    }
  }
  if (!certs[certs.length - 1].verify(root.publicKey)) {
    throw new AppleTransactionError('Invalid signed transaction');
  }

  const signature = decodeBase64Url(parts[2]);
  const der =
    signature.length === 64 ? rawEcSignatureToDer(signature) : signature;
  const signatureMatches = createVerify('SHA256')
    .update(`${parts[0]}.${parts[1]}`)
    .verify(certs[0].publicKey, der);
  if (!signatureMatches) {
    throw new AppleTransactionError('Invalid signed transaction');
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(decodeBase64Url(parts[1]).toString('utf8')) as Record<
      string,
      unknown
    >;
  } catch {
    throw new AppleTransactionError('Invalid signed transaction');
  }

  const transactionId = stringField(payload.transactionId);
  const bundleId = stringField(payload.bundleId);
  const productId = stringField(payload.productId);
  const environment = stringField(payload.environment);
  if (!transactionId || !bundleId || !productId || !environment) {
    throw new AppleTransactionError('Invalid signed transaction');
  }

  return {
    transactionId,
    originalTransactionId:
      stringField(payload.originalTransactionId) || transactionId,
    bundleId,
    productId,
    environment,
    expiresDate: numberField(payload.expiresDate),
    revocationDate: numberField(payload.revocationDate),
  };
}

function stringField(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function numberField(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
