/**
 * Store em memória para veículos rastreados.
 * Mantém o último estado de cada veículo para consulta do frontend.
 */

const db = require('./dbService');

const getStatesStmt = db.prepare(`
    SELECT
        veiculo_id,
        lat,
        lon,
        velocidade,
        timestamp,
        limite_via,
        via,
        alerta,
        mensagem,
        fonte,
        ultima_atualizacao,
        updated_at,
        owner_id
    FROM vehicle_state
`);

const getRoutePointsStmt = db.prepare(`
    SELECT lat, lon, timestamp
    FROM vehicle_route_points
    WHERE veiculo_id = ?
    ORDER BY id DESC
    LIMIT ?
`);

const upsertStateStmt = db.prepare(`
    INSERT INTO vehicle_state (
        veiculo_id,
        lat,
        lon,
        velocidade,
        timestamp,
        limite_via,
        via,
        alerta,
        mensagem,
        fonte,
        ultima_atualizacao,
        updated_at,
        owner_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(veiculo_id) DO UPDATE SET
        lat = excluded.lat,
        lon = excluded.lon,
        velocidade = excluded.velocidade,
        timestamp = excluded.timestamp,
        limite_via = excluded.limite_via,
        via = excluded.via,
        alerta = excluded.alerta,
        mensagem = excluded.mensagem,
        fonte = excluded.fonte,
        ultima_atualizacao = excluded.ultima_atualizacao,
        updated_at = excluded.updated_at,
        owner_id = COALESCE(excluded.owner_id, vehicle_state.owner_id)
`);

const insertRoutePointStmt = db.prepare(`
    INSERT INTO vehicle_route_points (veiculo_id, lat, lon, timestamp, created_at)
    VALUES (?, ?, ?, ?, ?)
`);

const pruneRoutePointsStmt = db.prepare(`
    DELETE FROM vehicle_route_points
    WHERE veiculo_id = ?
      AND id NOT IN (
        SELECT id
        FROM vehicle_route_points
        WHERE veiculo_id = ?
        ORDER BY id DESC
        LIMIT ?
      )
`);

const insertVehicleStmt = db.prepare(`
    INSERT INTO vehicles (veiculo_id, owner_id, created_at)
    VALUES (?, ?, ?)
`);

const findVehicleByIdStmt = db.prepare('SELECT veiculo_id, owner_id, created_at FROM vehicles WHERE veiculo_id = ?');
const listVehicleIdsByOwnerStmt = db.prepare('SELECT veiculo_id FROM vehicles WHERE owner_id = ? ORDER BY veiculo_id ASC');
const listAllVehiclesStmt = db.prepare('SELECT veiculo_id, owner_id, created_at FROM vehicles');

class VeiculoStore {
    constructor() {
        // Map<veiculo_id, { ...dadosVeiculo, ...dadosVia, updatedAt }>
        this.veiculos = new Map();
        this.MAX_TRAJETO_PONTOS = 120;

        this.loadFromDatabase();
    }

    loadFromDatabase() {
        const states = getStatesStmt.all();

        for (const row of states) {
            const trajeto = getRoutePointsStmt
                .all(row.veiculo_id, this.MAX_TRAJETO_PONTOS)
                .reverse();

            this.veiculos.set(row.veiculo_id, {
                lat: row.lat,
                lon: row.lon,
                velocidade: row.velocidade,
                timestamp: row.timestamp,
                limite_via: row.limite_via,
                via: row.via,
                alerta: Boolean(row.alerta),
                mensagem: row.mensagem,
                fonte: row.fonte,
                ultima_atualizacao: row.ultima_atualizacao,
                updatedAt: row.updated_at,
                ownerId: row.owner_id,
                trajeto,
            });
        }
    }

    shouldAppendToRoute(ultimoPonto, novoPonto) {
        if (!ultimoPonto) return true;

        const moveuLat = Math.abs(novoPonto.lat - ultimoPonto.lat) > 0.00001;
        const moveuLon = Math.abs(novoPonto.lon - ultimoPonto.lon) > 0.00001;

        return moveuLat || moveuLon;
    }

    /**
     * Atualiza (ou insere) o estado de um veículo.
     * @param {string} veiculoId
     * @param {Object} dados - Dados combinados do veículo + via
     */
    upsert(veiculoId, dados) {
        const agoraIso = new Date().toISOString();
        const atual = this.veiculos.get(veiculoId);
        const trajetoAtual = Array.isArray(atual?.trajeto) ? atual.trajeto : [];
        const novoPonto = {
            lat: dados.lat,
            lon: dados.lon,
            timestamp: dados.timestamp || agoraIso
        };
        const ultimoPonto = trajetoAtual[trajetoAtual.length - 1];
        const appendRoutePoint = this.shouldAppendToRoute(ultimoPonto, novoPonto);
        const trajeto = appendRoutePoint ? [...trajetoAtual, novoPonto].slice(-this.MAX_TRAJETO_PONTOS) : trajetoAtual;

        if (dados.ownerId) {
            db.prepare('INSERT OR IGNORE INTO vehicles (veiculo_id, owner_id, created_at) VALUES (?, ?, ?)')
                .run(veiculoId, dados.ownerId, agoraIso);
        }

        this.veiculos.set(veiculoId, {
            ...atual,
            ...dados,
            trajeto,
            updatedAt: agoraIso
        });

        upsertStateStmt.run(
            veiculoId,
            dados.lat,
            dados.lon,
            dados.velocidade,
            dados.timestamp || agoraIso,
            dados.limite_via,
            dados.via,
            dados.alerta ? 1 : 0,
            dados.mensagem,
            dados.fonte,
            dados.ultima_atualizacao || agoraIso,
            agoraIso,
            dados.ownerId || atual?.ownerId || null
        );

        if (appendRoutePoint) {
            insertRoutePointStmt.run(veiculoId, novoPonto.lat, novoPonto.lon, novoPonto.timestamp, agoraIso);
            pruneRoutePointsStmt.run(veiculoId, veiculoId, this.MAX_TRAJETO_PONTOS);
        }
    }

    cadastrarVeiculo(ownerId, placa) {
        const placaNormalizada = String(placa || '').trim().toUpperCase();

        if (!placaNormalizada) {
            throw new Error('Placa obrigatoria');
        }

        if (!/^[A-Z0-9-]{5,10}$/.test(placaNormalizada)) {
            throw new Error('Placa invalida. Use letras/numeros (5 a 10 caracteres).');
        }

        const existente = findVehicleByIdStmt.get(placaNormalizada);
        if (existente) {
            if (existente.owner_id !== ownerId) {
                throw new Error('Veiculo ja cadastrado em outra frota');
            }

            return {
                veiculo_id: existente.veiculo_id,
                owner_id: existente.owner_id,
                created_at: existente.created_at,
                ja_existia: true,
            };
        }

        const createdAt = new Date().toISOString();
        insertVehicleStmt.run(placaNormalizada, ownerId, createdAt);

        return {
            veiculo_id: placaNormalizada,
            owner_id: ownerId,
            created_at: createdAt,
            ja_existia: false,
        };
    }

    getFrotaByOwner(ownerId) {
        return listVehicleIdsByOwnerStmt.all(ownerId).map((row) => row.veiculo_id);
    }

    getAllVehiclesRegistry() {
        return listAllVehiclesStmt.all();
    }

    /**
     * Retorna todos os veículos como array.
     */
    getAll() {
        return Array.from(this.veiculos.entries()).map(([id, dados]) => ({
            veiculo_id: id,
            ...dados
        }));
    }

    /**
     * Retorna todos os veiculos que pertencem a uma frota especifica.
     * @param {string[]} frotaVeiculos
     */
    getAllByFrota(frotaVeiculos = []) {
        if (!Array.isArray(frotaVeiculos) || frotaVeiculos.length === 0) {
            return [];
        }

        const permitidos = new Set(frotaVeiculos);
        return this.getAll().filter((veiculo) => permitidos.has(veiculo.veiculo_id));
    }

    /**
     * Retorna um veículo específico.
     * @param {string} veiculoId
     */
    get(veiculoId) {
        const dados = this.veiculos.get(veiculoId);
        if (!dados) return null;
        return { veiculo_id: veiculoId, ...dados };
    }

    /**
     * Remove veículos inativos há mais de `ms` milissegundos.
     * @param {number} ms - Tempo de inatividade (padrão: 5 minutos)
     */
    cleanup(ms = 5 * 60 * 1000) {
        const agora = Date.now();
        let removidos = 0;
        for (const [id, dados] of this.veiculos) {
            if (agora - new Date(dados.updatedAt).getTime() > ms) {
                this.veiculos.delete(id);
                removidos++;
            }
        }
        return removidos;
    }

    get size() {
        return this.veiculos.size;
    }
}

// Singleton
module.exports = new VeiculoStore();
