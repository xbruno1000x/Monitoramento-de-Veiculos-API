# 🚗 API de Monitoramento de Velocidade - ESP32

API Node.js para receber dados de GPS do ESP32 (NEO-6M) e verificar se o veículo está dentro do limite de velocidade da via usando a Overpass API (OpenStreetMap).

## 📋 Funcionalidades

- ✅ Recebe dados de localização e velocidade do ESP32
- ✅ Consulta limite de velocidade da via no Overpass API
- ✅ Compara velocidade do veículo com o limite da via
- ✅ Retorna alerta quando veículo excede o limite
- ✅ Validação completa dos dados recebidos

## 🚀 Instalação

### Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn

### Passos

1. Clone ou baixe o projeto

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

4. Edite o arquivo `.env` se necessário (porta padrão: 3000)

## ▶️ Como Executar

### Modo Produção
```bash
npm start
```

### Modo Desenvolvimento (com auto-reload)
```bash
npm run dev
```

A API estará disponível em: `http://localhost:3000`

## 📡 Endpoints

### POST /api/veiculo
Recebe dados do ESP32 e retorna informações sobre limite de velocidade.

**Request Body:**
```json
{
  "veiculo_id": "ABC1234",
  "timestamp": "2025-11-10T17:32:12Z",
  "lat": -23.561684,
  "lon": -46.655981,
  "velocidade": 78
}
```

**Response (Veículo acima do limite):**
```json
{
  "limite_via": 60,
  "via": "Avenida Paulista",
  "alerta": true,
  "mensagem": "Veículo acima do limite em +18 km/h",
  "fonte": "OSM",
  "ultima_atualizacao": "2025-11-10T17:32:13Z"
}
```

**Response (Veículo dentro do limite):**
```json
{
  "limite_via": 60,
  "via": "Avenida Paulista",
  "alerta": false,
  "mensagem": "Velocidade dentro do limite",
  "fonte": "OSM",
  "ultima_atualizacao": "2025-11-10T17:32:13Z"
}
```

### GET /api/health
Verifica se a API está funcionando.

**Response:**
```json
{
  "status": "OK",
  "mensagem": "API funcionando corretamente",
  "timestamp": "2025-11-10T17:32:13Z"
}
```

## 🔧 Testando a API

### Com curl (PowerShell)
```powershell
$body = @{
    veiculo_id = "ABC1234"
    timestamp = "2025-11-10T17:32:12Z"
    lat = -23.561684
    lon = -46.655981
    velocidade = 78
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/veiculo -Method POST -Body $body -ContentType "application/json"
```

### Com Postman
1. Método: POST
2. URL: `http://localhost:3000/api/veiculo`
3. Headers: `Content-Type: application/json`
4. Body (raw JSON): Cole o JSON do exemplo acima

## 🔌 Integração com ESP32

### Exemplo de código Arduino/ESP32

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "SEU_WIFI";
const char* password = "SUA_SENHA";
const char* serverUrl = "http://SEU_IP:3000/api/veiculo";

void enviarDados(float lat, float lon, float velocidade) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    http.addHeader("Content-Type", "application/json");
    
    // Cria JSON
    StaticJsonDocument<200> doc;
    doc["veiculo_id"] = "ABC1234";
    doc["timestamp"] = "2025-11-10T17:32:12Z"; // Use RTC ou NTP
    doc["lat"] = lat;
    doc["lon"] = lon;
    doc["velocidade"] = velocidade;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    // Envia requisição
    int httpResponseCode = http.POST(jsonString);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      
      // Parse da resposta
      StaticJsonDocument<300> respDoc;
      deserializeJson(respDoc, response);
      
      bool alerta = respDoc["alerta"];
      int limiteVia = respDoc["limite_via"];
      const char* mensagem = respDoc["mensagem"];
      
      Serial.println("Limite: " + String(limiteVia) + " km/h");
      Serial.println("Alerta: " + String(alerta ? "SIM" : "NÃO"));
      Serial.println("Mensagem: " + String(mensagem));
      
      // Ação se houver alerta
      if (alerta) {
        // Acionar buzzer, LED, etc.
      }
    }
    
    http.end();
  }
}
```

## 📂 Estrutura do Projeto

```
IoT Project/
├── server.js                 # Servidor principal
├── package.json             # Dependências
├── .env                     # Variáveis de ambiente
├── routes/
│   └── veiculoRoutes.js    # Rotas da API
└── services/
    ├── overpassService.js  # Integração com Overpass API
    └── veiculoService.js   # Lógica de processamento
```

## 🛠️ Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Axios** - Cliente HTTP para consultar Overpass API
- **CORS** - Permite requisições cross-origin
- **dotenv** - Gerenciamento de variáveis de ambiente

## 📝 Observações

- A Overpass API tem limite de requisições. Use com moderação.
- Se não encontrar o limite de velocidade, retorna 50 km/h como padrão.
- O raio de busca é de 50 metros ao redor das coordenadas.
- Logs detalhados são exibidos no console para debug.

## 🐛 Troubleshooting

### API não encontra limite de velocidade
- Verifique se as coordenadas estão corretas
- Nem todas as vias no OSM têm dados de `maxspeed`
- A API retorna 50 km/h como padrão nestes casos

### Timeout na Overpass API
- A API pública pode estar sobrecarregada
- Tente novamente após alguns segundos
- Considere usar uma instância própria do Overpass

## 📄 Licença

MIT
