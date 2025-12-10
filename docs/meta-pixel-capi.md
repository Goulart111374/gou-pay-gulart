# Meta Pixel e Conversions API — Guia de Verificação, Correção e Deploy

## Verificações no Gerenciador de Eventos do Meta
- Confirme o `ID do Pixel` utilizado na aplicação corresponde ao Pixel desejado.
- Valide permissões do token da API: use um `Access Token` de Usuário do Sistema com acesso ao Pixel.
- Garanta que o domínio do site está verificado (DNS ou meta tag) no Business Manager.

## Endpoint da Conversions API
- Endpoint do backend: `POST /api/fb-events`.
- Em deploy na Vercel, mantenha o rewrite que preserva `/api/*`.
- Se front-end e API estiverem em origens distintas, defina `VITE_PUBLIC_API_BASE` apontando para a base pública da API.

## Localização no sistema
- A configuração do Meta Pixel e Token da API foi movida para a aba `Dashboard > Integração`.
- A aba `Pagamentos` permanece dedicada à integração do Mercado Pago (Access Token).

## Credenciais e Segurança
- O token é armazenado no cliente com criptografia básica; para produção, prefira manter tokens no backend.
- Use tokens com escopo suficiente para enviar eventos ao Pixel correspondente.

## Testes de Validação
- No Gerenciador de Eventos, copie o `test_event_code`.
- Envie um evento de teste para o endpoint:

```
POST <API_BASE>/api/fb-events
Content-Type: application/json

{
  "pixel_id": "<PIXEL_ID>",
  "token": "<ACCESS_TOKEN>",
  "test_event_code": "<TEST_EVENT_CODE>",
  "event": {
    "name": "PageView",
    "time": 1730000000000,
    "sourceUrl": "https://seu-dominio.com/"
  }
}
```

- Verifique no Gerenciador de Eventos se o evento de teste foi recebido.

## Interpretação de Erros
- `400 Invalid or missing pixel_id` → ID fora do padrão numérico.
- `400 Invalid or missing token` → token ausente ou curto.
- `400 Invalid or missing event` → payload incompleto.
- `Facebook API error` → detalhes retornados pela Graph API com código e mensagem.
- `404/503` ao chamar `/api/fb-events` → endpoint indisponível no deploy atual.

## Procedimento de Deploy
- Configure `VITE_PUBLIC_API_BASE` quando a API estiver em host diferente do front-end.
- Publique o diretório com o front-end preservando rotas `/api/*`.
- Valide após deploy: enviar `PageView` de teste e confirmar recepção.

## Boas Práticas
- Forneça `user_data` adequadamente (email/telefone/nome) — o backend aplica hash antes de enviar.
- Inclua `utm_campaign` na URL para análises agregadas de campanhas.
- Realize testes com `test_event_code` antes de liberar produção.
