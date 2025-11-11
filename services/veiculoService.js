/**
 * Processa os dados do veículo e verifica se está acima do limite
 * @param {Object} dadosVeiculo - Dados recebidos do ESP32
 * @param {Object} dadosVia - Dados da via da Overpass API
 * @returns {Object} Resposta formatada para o ESP32
 */
function processarDadosVeiculo(dadosVeiculo, dadosVia) {
    const { velocidade } = dadosVeiculo;
    const { limiteVia, nomeVia } = dadosVia;

    const acimaLimite = velocidade > limiteVia;
    const diferencaVelocidade = velocidade - limiteVia;

    const resposta = {
        limite_via: limiteVia,
        via: nomeVia,
        alerta: acimaLimite,
        mensagem: acimaLimite
            ? `Veículo acima do limite em +${diferencaVelocidade} km/h`
            : 'Velocidade dentro do limite',
        fonte: 'OSM',
        ultima_atualizacao: new Date().toISOString()
    };

    return resposta;
}

/**
 * Valida os dados recebidos do ESP32
 * @param {Object} dados - Dados a serem validados
 * @returns {Object} { valido: boolean, erro: string }
 */
function validarDadosVeiculo(dados) {
    if (!dados) {
        return { valido: false, erro: 'Nenhum dado fornecido' };
    }

    const { veiculo_id, timestamp, lat, lon, velocidade } = dados;

    if (!veiculo_id) {
        return { valido: false, erro: 'Campo veiculo_id é obrigatório' };
    }

    if (!timestamp) {
        return { valido: false, erro: 'Campo timestamp é obrigatório' };
    }

    if (lat === undefined || lat === null) {
        return { valido: false, erro: 'Campo lat é obrigatório' };
    }

    if (lon === undefined || lon === null) {
        return { valido: false, erro: 'Campo lon é obrigatório' };
    }

    if (velocidade === undefined || velocidade === null) {
        return { valido: false, erro: 'Campo velocidade é obrigatório' };
    }

    if (lat < -90 || lat > 90) {
        return { valido: false, erro: 'Latitude deve estar entre -90 e 90' };
    }

    if (lon < -180 || lon > 180) {
        return { valido: false, erro: 'Longitude deve estar entre -180 e 180' };
    }

    if (velocidade < 0 || velocidade > 300) {
        return { valido: false, erro: 'Velocidade deve estar entre 0 e 300 km/h' };
    }

    return { valido: true };
}

module.exports = {
    processarDadosVeiculo,
    validarDadosVeiculo
};
