/**
 * Serviço MQTT – broker embarcado (Aedes) + lógica de subscrição.
 *
 * Tópicos:
 *   PUBLISH  (ESP32 → Broker)   veiculos/{veiculo_id}/dados   JSON payload
 *   PUBLISH  (Broker → ESP32)   veiculos/{veiculo_id}/resposta JSON payload
 */

const aedes = require('aedes')();
const { createServer } = require('net');
const { consultarLimiteVelocidade } = require('./nominatimService');
const { processarDadosVeiculo, validarDadosVeiculo } = require('./veiculoService');
const veiculoStore = require('./veiculoStore');

const MQTT_PORT = process.env.MQTT_PORT || 1883;

/**
 * Inicia o broker MQTT e registra os handlers.
 */
function iniciarMQTT() {
    const server = createServer(aedes.handle);

    // --- Eventos do broker ---
    aedes.on('client', (client) => {
        console.log(`[MQTT] Cliente conectado: ${client.id}`);
    });

    aedes.on('clientDisconnect', (client) => {
        console.log(`[MQTT] Cliente desconectado: ${client.id}`);
    });

    aedes.on('subscribe', (subscriptions, client) => {
        const topics = subscriptions.map(s => s.topic).join(', ');
        console.log(`[MQTT] Cliente ${client.id} inscreveu-se em: ${topics}`);
    });

    // --- Handler principal: mensagens publicadas ---
    aedes.on('publish', async (packet, client) => {
        // Ignora mensagens internas do broker (começam com $)
        if (!client || packet.topic.startsWith('$')) return;

        const topicParts = packet.topic.split('/');

        // Espera formato: veiculos/{veiculo_id}/dados
        if (topicParts.length === 3 && topicParts[0] === 'veiculos' && topicParts[2] === 'dados') {
            await handleDadosVeiculo(topicParts[1], packet.payload);
        }
    });

    server.listen(MQTT_PORT, () => {
        console.log(`[MQTT] Broker Aedes rodando na porta ${MQTT_PORT}`);
    });

    return { aedes, server };
}

/**
 * Processa payload recebido no tópico veiculos/{id}/dados
 */
async function handleDadosVeiculo(veiculoIdTopic, payload) {
    try {
        const dadosVeiculo = JSON.parse(payload.toString());

        // Se o payload não incluir veiculo_id, usa o do tópico
        if (!dadosVeiculo.veiculo_id) {
            dadosVeiculo.veiculo_id = veiculoIdTopic;
        }

        console.log(`[MQTT] Dados recebidos de ${dadosVeiculo.veiculo_id}:`, dadosVeiculo);

        // Validação
        const validacao = validarDadosVeiculo(dadosVeiculo);
        if (!validacao.valido) {
            publicarResposta(dadosVeiculo.veiculo_id, {
                erro: validacao.erro,
                ultima_atualizacao: new Date().toISOString()
            });
            return;
        }

        const { lat, lon, velocidade, veiculo_id } = dadosVeiculo;
        const dadosVia = await consultarLimiteVelocidade(lat, lon);
        const resposta = processarDadosVeiculo(dadosVeiculo, dadosVia);

        console.log(
            `[MQTT] Veículo: ${veiculo_id}, Via: ${dadosVia.nomeVia}, ` +
            `Velocidade: ${velocidade} km/h, Limite: ${dadosVia.limiteVia} km/h, ` +
            `Alerta: ${resposta.alerta}`
        );

        // Salva no store para o frontend
        veiculoStore.upsert(veiculo_id, {
            lat,
            lon,
            velocidade,
            timestamp: dadosVeiculo.timestamp,
            ...resposta
        });

        // Publica resposta de volta para o ESP32
        publicarResposta(veiculo_id, resposta);

    } catch (err) {
        console.error('[MQTT] Erro ao processar mensagem:', err.message);
    }
}

/**
 * Publica resposta no tópico veiculos/{id}/resposta
 */
function publicarResposta(veiculoId, dados) {
    const topic = `veiculos/${veiculoId}/resposta`;
    const payload = JSON.stringify(dados);

    aedes.publish({
        topic,
        payload: Buffer.from(payload),
        qos: 1,
        retain: false
    }, () => {
        console.log(`[MQTT] Resposta publicada em ${topic}`);
    });
}

module.exports = { iniciarMQTT };
