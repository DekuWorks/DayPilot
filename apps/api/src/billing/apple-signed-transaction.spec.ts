import { execFileSync } from 'child_process';
import { createSign, randomUUID } from 'crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  APPLE_ROOT_CA_G3_PEM,
  AppleTransactionError,
  verifyAppleSignedTransaction,
} from './apple-signed-transaction';

function b64url(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url');
}

function makeChain() {
  const dir = mkdtempSync(join(tmpdir(), 'apple-jws-'));
  const run = (args: string[]) =>
    execFileSync('openssl', args, { cwd: dir, stdio: 'pipe' });
  run([
    'ecparam',
    '-name',
    'prime256v1',
    '-genkey',
    '-noout',
    '-out',
    'root.key',
  ]);
  run([
    'req',
    '-x509',
    '-new',
    '-key',
    'root.key',
    '-sha256',
    '-days',
    '30',
    '-subj',
    '/CN=Test Root',
    '-out',
    'root.pem',
  ]);
  run([
    'ecparam',
    '-name',
    'prime256v1',
    '-genkey',
    '-noout',
    '-out',
    'mid.key',
  ]);
  run([
    'req',
    '-new',
    '-key',
    'mid.key',
    '-subj',
    '/CN=Test Intermediate',
    '-out',
    'mid.csr',
  ]);
  run([
    'x509',
    '-req',
    '-in',
    'mid.csr',
    '-CA',
    'root.pem',
    '-CAkey',
    'root.key',
    '-sha256',
    '-days',
    '30',
    '-set_serial',
    '2',
    '-out',
    'mid.pem',
  ]);
  run([
    'ecparam',
    '-name',
    'prime256v1',
    '-genkey',
    '-noout',
    '-out',
    'leaf.key',
  ]);
  run([
    'req',
    '-new',
    '-key',
    'leaf.key',
    '-subj',
    '/CN=Test Leaf',
    '-out',
    'leaf.csr',
  ]);
  run([
    'x509',
    '-req',
    '-in',
    'leaf.csr',
    '-CA',
    'mid.pem',
    '-CAkey',
    'mid.key',
    '-sha256',
    '-days',
    '30',
    '-set_serial',
    '3',
    '-out',
    'leaf.pem',
  ]);
  const der = (name: string) => {
    const pem = readFileSync(join(dir, name));
    const out = join(dir, `${name}.der`);
    writeFileSync(out, pem);
    run(['x509', '-in', name, '-outform', 'DER', '-out', `${name}.der`]);
    return readFileSync(out).toString('base64');
  };
  return {
    rootPem: readFileSync(join(dir, 'root.pem'), 'utf8'),
    leafKey: readFileSync(join(dir, 'leaf.key'), 'utf8'),
    leafDer: der('leaf.pem'),
    midDer: der('mid.pem'),
  };
}

function signTransaction(
  leafKey: string,
  x5c: string[],
  payload: Record<string, unknown>,
): string {
  const header = b64url(JSON.stringify({ alg: 'ES256', x5c }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const signature = createSign('SHA256')
    .update(data)
    .sign({ key: leafKey, dsaEncoding: 'ieee-p1363' });
  return `${data}.${b64url(signature)}`;
}

describe('verifyAppleSignedTransaction', () => {
  const chain = makeChain();
  const payload = {
    transactionId: '2000000123',
    originalTransactionId: '2000000999',
    bundleId: 'com.dekuworks.daypilot',
    productId: 'co.daypilot.personal.monthly',
    environment: 'Production',
    expiresDate: Date.now() + 86_400_000,
  };

  it('accepts a transaction signed by a certificate that chains to the root', () => {
    const jws = signTransaction(
      chain.leafKey,
      [chain.leafDer, chain.midDer],
      payload,
    );
    expect(verifyAppleSignedTransaction(jws, chain.rootPem)).toMatchObject({
      transactionId: '2000000123',
      originalTransactionId: '2000000999',
      productId: 'co.daypilot.personal.monthly',
      environment: 'Production',
    });
  });

  it('rejects a transaction signed under a different root', () => {
    const jws = signTransaction(
      chain.leafKey,
      [chain.leafDer, chain.midDer],
      payload,
    );
    expect(() =>
      verifyAppleSignedTransaction(jws, APPLE_ROOT_CA_G3_PEM),
    ).toThrow(AppleTransactionError);
  });

  it('rejects a payload changed after signing', () => {
    const jws = signTransaction(
      chain.leafKey,
      [chain.leafDer, chain.midDer],
      payload,
    );
    const [header, , signature] = jws.split('.');
    const tampered = b64url(
      JSON.stringify({
        ...payload,
        productId: 'co.daypilot.enterprise.monthly',
      }),
    );
    expect(() =>
      verifyAppleSignedTransaction(
        `${header}.${tampered}.${signature}`,
        chain.rootPem,
      ),
    ).toThrow(AppleTransactionError);
  });

  it('rejects a transaction with no certificate chain', () => {
    const header = b64url(JSON.stringify({ alg: 'ES256', x5c: [] }));
    const body = b64url(JSON.stringify(payload));
    expect(() =>
      verifyAppleSignedTransaction(
        `${header}.${body}.${randomUUID()}`,
        chain.rootPem,
      ),
    ).toThrow(AppleTransactionError);
  });
});
