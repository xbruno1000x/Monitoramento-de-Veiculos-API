require('dotenv').config();
const express = require('express');
const cors = require('cors');
const veiculoRoutes = require('./routes/veiculoRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permite requisições de qualquer origem
app.use(express.json()); // Parse de JSON no body
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Rotas
app.use('/api', veiculoRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    mensagem: 'API de Monitoramento de Velocidade - ESP32',
    versao: '1.0.0',
    endpoints: {
      'POST /api/veiculo': 'Recebe dados do ESP32 e retorna limite de velocidade',
      'GET /api/health': 'Verifica status da API'
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

app.listen(PORT, () => {
  console.log('===========================================');
  console.log(`🚗 API de Monitoramento de Velocidade`);
  console.log(`📡 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log('===========================================');
  console.log('Endpoints disponíveis:');
  console.log(`  POST http://localhost:${PORT}/api/veiculo`);
  console.log(`  GET  http://localhost:${PORT}/api/health`);
  console.log('===========================================');
});
