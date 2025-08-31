## Chat embebido en Framer conectado a n8n

Este proyecto implementa un chat embebido en Framer que envía mensajes a un webhook de n8n y espera la respuesta para renderizarla. Soporta texto y audio (en base64).

### Flujo
- Usuario envía texto o audio.
- El componente hace POST al webhook con un payload JSON.
- Muestra estado de envío y un indicador "Escribiendo…" mientras espera.
- n8n responde con uno o varios mensajes; el componente los renderiza como burbujas.

### Archivo principal
- `chat.tsx` con props: `webhookUrl`, `title`, `description`.

### Payload hacia n8n
Texto:
```json
{ "conversationId": "conv_...", "message": "Hola", "timestamp": "2024-01-01T00:00:00.000Z" }
```

Audio (base64):
```json
{
  "conversationId": "conv_...",
  "message": "",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "audio": { "base64": "<BASE64>", "mimeType": "audio/webm", "durationMs": 12345 }
}
```

### Formatos de respuesta soportados desde n8n
- Array con `output.respuesta`:
```json
[{"output.respuesta":"Hola"},{"output.respuesta":"¿En qué puedo ayudarte?"}]
```
- Objeto único con `output.respuesta`:
```json
{"output.respuesta":"Hola"}
```
- `{ "output": "texto" }`, o `[{"output":"texto"}]`, o texto plano.

### Indicador "Escribiendo…"
- Controlado por `typing`. Se activa al enviar la solicitud y se desactiva al recibir respuesta o error.

### Envío de audio
- Botón de micrófono inicia/detiene grabación con `MediaRecorder`.
- Se convierte el `Blob` a base64 y se envía en `audio.base64` con `mimeType` y `durationMs` opcional.

### Configuración
- En Framer, establecer `webhookUrl` con tu endpoint de n8n.
- En n8n, crear un Webhook (POST), leer `conversationId`, `message`, y `audio.*` si está presente, y responder en cualquiera de los formatos soportados.


