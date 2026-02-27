/**
 * Store em memória para veículos rastreados.
 * Mantém o último estado de cada veículo para consulta do frontend.
 */

class VeiculoStore {
    constructor() {
        // Map<veiculo_id, { ...dadosVeiculo, ...dadosVia, updatedAt }>
        this.veiculos = new Map();
    }

    /**
     * Atualiza (ou insere) o estado de um veículo.
     * @param {string} veiculoId
     * @param {Object} dados - Dados combinados do veículo + via
     */
    upsert(veiculoId, dados) {
        this.veiculos.set(veiculoId, {
            ...dados,
            updatedAt: new Date().toISOString()
        });
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
