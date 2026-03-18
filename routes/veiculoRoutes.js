const express = require('express');
const { consultarLimiteVelocidade } = require('../services/nominatimService');
const { processarDadosVeiculo, validarDadosVeiculo } = require('../services/veiculoService');
const cacheService = require('../services/cacheService');
const veiculoStore = require('../services/veiculoStore');
const authService = require('../services/authService');

const router = express.Router();

function autenticar(req, res, next) {
    const header = req.headers.authorization || '';
    const match = header.match(/^Bearer\s+(.+)$/i);

    if (!match) {
        return res.status(401).json({ erro: 'Nao autenticado' });
    }

    const token = match[1];
    const sessao = authService.getSessionByToken(token);

    if (!sessao) {
        return res.status(401).json({ erro: 'Token invalido ou expirado' });
    }

    req.usuario = sessao.usuario;
    next();
}

/**
 * POST /api/auth/login
 * Realiza login e retorna token de sessao.
 */
router.post('/auth/login', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    if (!username || !password) {
        return res.status(400).json({ erro: 'username e password sao obrigatorios' });
    }

    const loginResult = authService.login(username, password);
    if (!loginResult) {
        return res.status(401).json({ erro: 'Credenciais invalidas' });
    }

    res.json(loginResult);
});

/**
 * GET /api/auth/me
 * Retorna dados do usuario autenticado.
 */
router.get('/auth/me', autenticar, (req, res) => {
    res.json({ usuario: req.usuario });
});

/**
 * POST /api/veiculos/cadastro
 * Cadastra veiculo na frota do usuario autenticado.
 */
router.post('/veiculos/cadastro', autenticar, (req, res) => {
    try {
        const { placa } = req.body || {};
        const registro = veiculoStore.cadastrarVeiculo(req.usuario.id, placa);

        return res.status(registro.ja_existia ? 200 : 201).json({
            status: 'OK',
            mensagem: registro.ja_existia
                ? 'Veiculo ja estava cadastrado na sua frota'
                : 'Veiculo cadastrado com sucesso',
            veiculo: registro,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return res.status(400).json({
            erro: 'Nao foi possivel cadastrar veiculo',
            mensagem: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

/**
 * GET /api/veiculos
 * Retorna todos os veículos rastreados (usado pelo frontend)
 */
router.get('/veiculos', autenticar, (req, res) => {
    const frota = Array.isArray(req.usuario?.frota) ? req.usuario.frota : [];
    const veiculos = veiculoStore.getAllByFrota(frota);
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
router.get('/veiculo/:id', autenticar, (req, res) => {
    if (!req.usuario.frota.includes(req.params.id)) {
        return res.status(403).json({ erro: 'Acesso negado para este veiculo' });
    }

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
        const dadosVeiculo = req.body || {};

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
        const ownerId = authService.getOwnerByVeiculoId(veiculo_id);

        veiculoStore.upsert(veiculo_id, {
            lat,
            lon,
            velocidade,
            timestamp: dadosVeiculo.timestamp,
            ownerId,
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
router.get('/cache/stats', autenticar, (req, res) => {
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
router.post('/cache/clear', autenticar, (req, res) => {
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
router.post('/cache/cleanup', autenticar, (req, res) => {
    const removidas = cacheService.cleanup();
    
    res.json({
        status: 'OK',
        mensagem: 'Limpeza de cache executada',
        entradas_removidas: removidas,
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
