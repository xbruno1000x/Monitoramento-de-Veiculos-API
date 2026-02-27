const express = require('express');
const { consultarLimiteVelocidade } = require('../services/nominatimService');
const { processarDadosVeiculo, validarDadosVeiculo } = require('../services/veiculoService');
const cacheService = require('../services/cacheService');
const veiculoStore = require('../services/veiculoStore');

const router = express.Router();

/**
 * GET /api/veiculos
 * Retorna todos os veículos rastreados (usado pelo frontend)
 */
router.get('/veiculos', (req, res) => {
    const veiculos = veiculoStore.getAll();
    res.json({
        total: veiculos.length,
        veiculos,
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/veiculo/:id
 * Retorna dados de um veículo específico
 */
router.get('/veiculo/:id', (req, res) => {
    const veiculo = veiculoStore.get(req.params.id);
    if (!veiculo) {
        return res.status(404).json({ erro: 'Veículo não encontrado' });
    }
    res.json(veiculo);
});

/**
 * POST /api/veiculo
 * Recebe dados do ESP32 via HTTP e retorna informações sobre limite de velocidade
 * (mantido para compatibilidade — o método principal agora é MQTT)
 */
router.post('/veiculo', async (req, res) => {
    try {
        const dadosVeiculo = req.body;

        console.log(`[${new Date().toISOString()}] Dados recebidos (HTTP):`, dadosVeiculo);

        const validacao = validarDadosVeiculo(dadosVeiculo);
        if (!validacao.valido) {
            return res.status(400).json({
                erro: validacao.erro,
                ultima_atualizacao: new Date().toISOString()
            });
        }

        const { lat, lon, veiculo_id, velocidade } = dadosVeiculo;
        const dadosVia = await consultarLimiteVelocidade(lat, lon);
        const resposta = processarDadosVeiculo(dadosVeiculo, dadosVia);

        // Salva no store para o frontend
        veiculoStore.upsert(veiculo_id, {
            lat,
            lon,
            velocidade,
            timestamp: dadosVeiculo.timestamp,
            ...resposta
        });

        console.log(`[${new Date().toISOString()}] Veículo: ${veiculo_id}, Via: ${dadosVia.nomeVia}, Velocidade: ${velocidade} km/h, Limite: ${dadosVia.limiteVia} km/h, Alerta: ${resposta.alerta}`);

        res.json(resposta);

    } catch (error) {
        console.error('Erro ao processar requisição:', error);
        res.status(500).json({
            erro: 'Erro interno do servidor',
            mensagem: error.message,
            ultima_atualizacao: new Date().toISOString()
        });
    }
});

/**
 * GET /api/health
 * Endpoint para verificar se a API está funcionando
 */
router.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        mensagem: 'API funcionando corretamente',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/cache/stats
 * Retorna estatísticas detalhadas do cache
 */
router.get('/cache/stats', (req, res) => {
    const stats = cacheService.getStats();
    
    res.json({
        status: 'OK',
        cache: stats,
        descricao: {
            total_requisicoes: 'Total de consultas processadas',
            cache_hits: 'Requisições atendidas pelo cache (rápidas)',
            cache_misses: 'Requisições que consultaram Overpass API',
            entradas_ativas: 'Quantidade de locais em cache no momento',
            hit_rate: 'Percentual de requisições atendidas pelo cache',
            reducao_chamadas_api: 'Percentual de redução de chamadas à API externa'
        },
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/cache/clear
 * Limpa todo o cache (uso administrativo)
 */
router.post('/cache/clear', (req, res) => {
    const removidas = cacheService.clear();
    
    res.json({
        status: 'OK',
        mensagem: 'Cache limpo com sucesso',
        entradas_removidas: removidas,
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/cache/cleanup
 * Remove apenas entradas expiradas do cache
 */
router.post('/cache/cleanup', (req, res) => {
    const removidas = cacheService.cleanup();
    
    res.json({
        status: 'OK',
        mensagem: 'Limpeza de cache executada',
        entradas_removidas: removidas,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
