const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { hashPassword } = require('./passwordService');

const dataDir = path.join(__dirname, '..', 'data');
const dbFilePath = path.join(dataDir, 'iot.db');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbFilePath);
db.pragma('journal_mode = WAL');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        nome TEXT NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
        veiculo_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS vehicle_state (
        veiculo_id TEXT PRIMARY KEY,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        velocidade REAL NOT NULL,
        timestamp TEXT NOT NULL,
        limite_via INTEGER NOT NULL,
        via TEXT NOT NULL,
        alerta INTEGER NOT NULL,
        mensagem TEXT NOT NULL,
        fonte TEXT NOT NULL,
        ultima_atualizacao TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        owner_id TEXT,
        FOREIGN KEY(veiculo_id) REFERENCES vehicles(veiculo_id),
        FOREIGN KEY(owner_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS vehicle_route_points (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        veiculo_id TEXT NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        timestamp TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(veiculo_id) REFERENCES vehicles(veiculo_id)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_route_points_veiculo ON vehicle_route_points(veiculo_id, id);
`);

const defaultUsers = [
    {
        id: 'u-alfa',
        username: 'alfa',
        password: 'alfa123',
        nome: 'Operacao Alfa',
        frota: ['ABC1234', 'XYZ9876', 'ESP001']
    },
    {
        id: 'u-beta',
        username: 'beta',
        password: 'beta123',
        nome: 'Operacao Beta',
        frota: ['DEF5678', 'GHI4321', 'ESP002']
    }
];

const countUsers = db.prepare('SELECT COUNT(*) as total FROM users').get().total;

if (countUsers === 0) {
    const nowIso = new Date().toISOString();
    const insertUserStmt = db.prepare(`
        INSERT INTO users (id, username, password, nome, created_at)
        VALUES (@id, @username, @password, @nome, @created_at)
    `);
    const insertVehicleStmt = db.prepare(`
        INSERT INTO vehicles (veiculo_id, owner_id, created_at)
        VALUES (?, ?, ?)
    `);

    const seedTransaction = db.transaction(() => {
        for (const user of defaultUsers) {
            insertUserStmt.run({
                id: user.id,
                username: user.username,
                password: hashPassword(user.password),
                nome: user.nome,
                created_at: nowIso
            });

            for (const placa of user.frota) {
                insertVehicleStmt.run(placa, user.id, nowIso);
            }
        }
    });

    seedTransaction();
}

module.exports = db;