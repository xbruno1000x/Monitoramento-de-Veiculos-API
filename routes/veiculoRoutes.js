const express = require('express');
const { consultarLimiteVelocidade } = require('../services/overpassService');
const { processarDadosVeiculo, validarDadosVeiculo } = require('../services/veiculoService');

const router = express.Router();

/**
 * POST /api/veiculo
 * Recebe dados do ESP32 e retorna informações sobre limite de velocidade
 */
router.post('/veiculo', async (req, res) => {
    try {
        const dadosVeiculo = req.body;

        console.log(`[${new Date().toISOString()}] Dados recebidos:`, dadosVeiculo);

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

module.exports = router;
