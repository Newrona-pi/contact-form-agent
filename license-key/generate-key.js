import crypto from 'crypto';

function group4(s) {
  return s.match(/.{1,4}/g)?.join('-') ?? s;
}

function generateSecret() {
  const raw = crypto.randomBytes(16).toString('base64url');
  return raw.toUpperCase();
}

const keyId = '145AA4D068A3';
const secret = generateSecret();
const fullKey = `RP1-${group4(keyId)}.${group4(secret)}`;

console.log('=== ライセンスキー ===');
console.log('Key ID:', keyId);
console.log('Secret:', secret);
console.log('Full License Key:', fullKey);
console.log('==================');
