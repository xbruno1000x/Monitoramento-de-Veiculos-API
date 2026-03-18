const crypto = require('crypto');
const db = require('./dbService');
const { needsRehash, verifyPassword, hashPassword } = require('./passwordService');

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

const findUserByUsernameStmt = db.prepare('SELECT id, username, password, nome FROM users WHERE username = ?');
const findUserByIdStmt = db.prepare('SELECT id, username, nome FROM users WHERE id = ?');
const listFrotaByUserIdStmt = db.prepare('SELECT veiculo_id FROM vehicles WHERE owner_id = ? ORDER BY veiculo_id ASC');
const insertSessionStmt = db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
`);
const findSessionByTokenStmt = db.prepare('SELECT token, user_id, expires_at FROM sessions WHERE token = ?');
const deleteSessionByTokenStmt = db.prepare('DELETE FROM sessions WHERE token = ?');
const cleanupExpiredSessionsStmt = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
const findOwnerByVeiculoStmt = db.prepare('SELECT owner_id FROM vehicles WHERE veiculo_id = ?');
const updateUserPasswordStmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');

function getFrotaByUserId(userId) {
    return listFrotaByUserIdStmt.all(userId).map((row) => row.veiculo_id);
}

function getUserById(userId) {
    const user = findUserByIdStmt.get(userId);
    if (!user) return null;
    return {
        ...user,
        frota: getFrotaByUserId(user.id)
    };
}

function sanitizeUser(user) {
    return {
        id: user.id,
        username: user.username,
        nome: user.nome,
        frota: user.frota
    };
}

function issueToken(userId) {
    const token = crypto.randomBytes(24).toString('hex');
    const now = Date.now();
    const expiresAt = now + TOKEN_TTL_MS;

    cleanupExpiredSessionsStmt.run(now);
    insertSessionStmt.run(token, userId, expiresAt, new Date(now).toISOString());

    return token;
}

function login(username, password) {
    const usernameNormalizado = String(username || '').trim();
    const passwordNormalizada = String(password || '');

    const user = findUserByUsernameStmt.get(usernameNormalizado);
    if (!user || !verifyPassword(passwordNormalizada, user.password)) {
        return null;
    }

    if (needsRehash(user.password)) {
        updateUserPasswordStmt.run(hashPassword(passwordNormalizada), user.id);
    }

    const fullUser = getUserById(user.id);
    if (!fullUser) {
        return null;
    }

    const token = issueToken(user.id);

    return {
        token,
        expires_in: Math.floor(TOKEN_TTL_MS / 1000),
        usuario: sanitizeUser(fullUser)
    };
}

function getSessionByToken(token) {
    const session = findSessionByTokenStmt.get(token);
    if (!session) {
        return null;
    }

    if (session.expires_at <= Date.now()) {
        deleteSessionByTokenStmt.run(token);
        return null;
    }

    const user = getUserById(session.user_id);
    if (!user) {
        deleteSessionByTokenStmt.run(token);
        return null;
    }

    return {
        token,
        usuario: sanitizeUser(user)
    };
}

function getOwnerByVeiculoId(veiculoId) {
    const row = findOwnerByVeiculoStmt.get(veiculoId);
    return row?.owner_id || null;
}

module.exports = {
    login,
    getSessionByToken,
    getOwnerByVeiculoId
};