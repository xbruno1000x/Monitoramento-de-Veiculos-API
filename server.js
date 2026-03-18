require('dotenv').config();
const express = require('express');
const cors = require('cors');
const veiculoRoutes = require('./routes/veiculoRoutes');
const { iniciarMQTT } = require('./services/mqttService');

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || '*';

// Middlewares
app.disable('x-powered-by');
app.use(cors({
  origin: ALLOWED_ORIGIN,
}));
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${req.ip}`);
  next();
});

// Rotas
app.use('/api', veiculoRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    mensagem: 'API de Monitoramento de Velocidade - ESP32',
    versao: '2.0.0',
    protocolos: ['HTTP/REST', 'MQTT'],
    endpoints: {
      'POST /api/auth/login': 'Login e emissao de token',
      'GET  /api/auth/me': 'Dados do usuario autenticado',
      'POST /api/veiculos/cadastro': 'Cadastra um novo veiculo na frota do usuario',
      'POST /api/veiculo': 'Recebe dados do ESP32 via HTTP (compatibilidade)',
      'GET  /api/veiculos': 'Lista veiculos da frota do usuario autenticado',
      'GET  /api/veiculo/:id': 'Dados de um veiculo da frota do usuario autenticado',
      'GET  /api/health': 'Verifica status da API'
    },
    mqtt: {
      porta: process.env.MQTT_PORT || 1883,
      topico_publicar: 'veiculos/{veiculo_id}/dados',
      topico_resposta: 'veiculos/{veiculo_id}/resposta'
    }
  });
});

// Tratamento de rotas não encontradas
app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota não encontrada',
    mensagem: `A rota ${req.method} ${req.url} não existe`
  });
});

app.use((error, req, res, next) => {
  console.error('Erro nao tratado:', error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(error.status || 500).json({
    erro: 'Erro interno do servidor',
    mensagem: process.env.NODE_ENV === 'production' ? 'Falha inesperada' : error.message,
    timestamp: new Date().toISOString(),
  });
});

// Inicia servidor HTTP
app.listen(PORT, () => {
  console.log('===========================================');
  console.log(`🚗 API de Monitoramento de Velocidade v2.0`);
  console.log(`📡 HTTP rodando na porta ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log('===========================================');
  console.log('Endpoints HTTP:');
  console.log(`  POST http://localhost:${PORT}/api/veiculo`);
  console.log(`  GET  http://localhost:${PORT}/api/veiculos`);
  console.log(`  GET  http://localhost:${PORT}/api/health`);
  console.log('===========================================');
});

// Inicia broker MQTT
iniciarMQTT();
console.log('===========================================');
console.log('Tópicos MQTT:');
console.log('  PUB  veiculos/{id}/dados     → envia dados');
console.log('  SUB  veiculos/{id}/resposta   → recebe resposta');
console.log('===========================================');
