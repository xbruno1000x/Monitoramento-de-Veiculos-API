const axios = require('axios');

/**
 * Consulta o limite de velocidade de uma via usando a Overpass API
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Dados da via e limite de velocidade
 */
async function consultarLimiteVelocidade(lat, lon) {
    try {
        const raio = 50;

        const overpassQuery = `
      [out:json];
      (
        way(around:${raio},${lat},${lon})["highway"]["maxspeed"];
      );
      out body;
      >;
      out skel qt;
    `;

        const response = await axios.post(
            'https://overpass-api.de/api/interpreter',
            overpassQuery,
            {
                headers: {
                    'Content-Type': 'text/plain'
                },
                timeout: 10000 // 10 segundos de timeout
            }
        );

        const elements = response.data.elements;

        if (elements && elements.length > 0) {
            const via = elements[0];
            const maxspeed = via.tags.maxspeed;
            const nomeVia = via.tags.name || 'Via sem nome';

            let limiteVia = parseInt(maxspeed);

            if (isNaN(limiteVia)) {
                limiteVia = 50; // Valor padrão
            }

            return {
                limiteVia,
                nomeVia,
                encontrado: true
            };
        } else {
            return {
                limiteVia: 50,
                nomeVia: 'Via não identificada',
                encontrado: false
            };
        }
    } catch (error) {
        console.error('Erro ao consultar Overpass API:', error.message);
        return {
            limiteVia: 50,
            nomeVia: 'Via não identificada',
            encontrado: false,
            erro: error.message
        };
    }
}

module.exports = {
    consultarLimiteVelocidade
};
