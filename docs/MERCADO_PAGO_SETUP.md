# Guia de Configuração Mercado Pago (Marketplace)

Para que o sistema de Marketplace funcione (Split de pagamentos e OAuth), você precisa configurar uma Aplicação no painel de desenvolvedor do Mercado Pago.

## 1. Criar Aplicação

1. Acesse [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel).
2. Clique em **"Criar aplicação"**.
3. Escolha um nome (ex: "GouPay Marketplace").
4. Em "Tipo de solução", selecione **"Pagamento on-line"**.
5. Em "Você está usando uma plataforma de e-commerce?", selecione **"Não"**.
6. Aceite os termos e crie a aplicação.

## 2. Configurar OAuth (Vínculo de Vendedores)

1. No menu lateral da sua aplicação, vá em **"Autenticação e Segurança"** (ou "OAuth").
2. Em **"URLs de redirecionamento"**, adicione a URL da sua API que criamos:
   - Produção: `https://sua-url-oficial.com/api/mp-oauth-callback`
   - Desenvolvimento (Local): `http://localhost:3000/api/mp-oauth-callback` (se estiver usando túnel ou localhost)
   > **Nota:** O Mercado Pago exige HTTPS para produção. Para testes locais, você pode precisar de ferramentas como Ngrok se o MP bloquear localhost.

## 3. Obter Credenciais

No menu lateral, vá em **"Credenciais de produção"** (ou "Credenciais de teste" para Sandbox).

Você precisará de:

| Variável | Onde encontrar | Descrição |
|----------|----------------|-----------|
| `MP_CLIENT_ID` | Client ID | Identificador da sua aplicação. |
| `MP_CLIENT_SECRET` | Client Secret | Senha secreta para troca de tokens. |
| `MP_PLATFORM_ACCESS_TOKEN` | Access Token | Token da **SUA** conta (Plataforma), usado para estornos ou consultas administrativas. |

## 4. Configurar no Projeto

Adicione estas variáveis no seu arquivo `.env` (local) ou nas variáveis de ambiente da Vercel/Hospedagem:

```env
# Mercado Pago Marketplace Credentials
MP_CLIENT_ID=APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MP_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MP_REDIRECT_URI=https://seu-site.com/api/mp-oauth-callback

# Frontend URL (para redirecionar o vendedor após conectar)
FRONTEND_URL=https://seu-site.com
```

## 5. Como Validar

1. Use as **Credenciais de Teste** inicialmente.
2. Crie uma conta de vendedor de teste no MP (não use sua conta pessoal).
3. No seu sistema, inicie o fluxo de conexão.
4. O MP deve perguntar: *"GouPay quer gerenciar seus pagamentos"*.
5. Ao aceitar, o sistema deve salvar o `access_token` desse vendedor no banco de dados.

---

### Dicas Importantes
- **Contas de Teste:** Crie contas fictícias em [Contas de Teste](https://www.mercadopago.com.br/developers/panel/test-accounts) para simular Vendedor e Comprador. Não use sua conta real para testes de split, pois o MP bloqueia transações entre a mesma conta.
- **Split:** O split só funciona se o pagamento for criado usando o `access_token` do VENDEDOR, mas a aplicação (`client_id`) for a SUA.
