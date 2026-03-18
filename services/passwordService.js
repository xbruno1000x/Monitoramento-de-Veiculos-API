const crypto = require('crypto');

const HASH_PREFIX = 'scrypt';
const SCRYPT_KEYLEN = 64;

function hashPassword(password) {
    const plain = String(password || '');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(plain, salt, SCRYPT_KEYLEN).toString('hex');
    return `${HASH_PREFIX}$${salt}$${hash}`;
}

function isHashedPassword(value) {
    return typeof value === 'string' && value.startsWith(`${HASH_PREFIX}$`);
}

function verifyHashedPassword(password, storedHash) {
    const parts = String(storedHash).split('$');
    if (parts.length !== 3) return false;

    const [, salt, expectedHash] = parts;
    const calculatedHash = crypto.scryptSync(String(password || ''), salt, SCRYPT_KEYLEN).toString('hex');

    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

    if (expectedBuffer.length !== calculatedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, calculatedBuffer);
}

function verifyPassword(password, storedPassword) {
    if (isHashedPassword(storedPassword)) {
        return verifyHashedPassword(password, storedPassword);
    }

    // Backward compatibility: existing local databases may still use plain-text seeds.
    return String(password || '') === String(storedPassword || '');
}

function needsRehash(storedPassword) {
    return !isHashedPassword(storedPassword);
}

module.exports = {
    hashPassword,
    verifyPassword,
    needsRehash,
};