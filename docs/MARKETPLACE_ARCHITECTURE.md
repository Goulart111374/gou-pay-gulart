# Arquitetura do Sistema de Pagamentos Marketplace (GouPay)

## Visão Geral
Este documento detalha a arquitetura para transformar o sistema atual em um **Marketplace** com **Split de Pagamentos** utilizando o Mercado Pago.

### Fluxo de Valores (Split)
1. **Cliente** paga R$ 100,00.
2. **Mercado Pago** processa o pagamento.
3. **Mercado Pago** retém a taxa de processamento (ex: 3.99%).
4. **Mercado Pago** separa a comissão da Plataforma (definida no checkout, ex: 10% = R$ 10,00).
5. **Mercado Pago** deposita o restante na conta do Vendedor.
6. **Resultado:** O dinheiro nunca passa pela conta bancária da Plataforma antes de ser dividido. A custódia é 100% do Mercado Pago.

---

## 1. Fluxo de Onboarding (Vínculo do Vendedor)
Para que a plataforma possa criar cobranças em nome do vendedor e reter comissões, o vendedor precisa autorizar a aplicação.

**Fluxo OAuth (Recomendado):**
1. Vendedor clica em "Conectar Mercado Pago" no painel.
2. Plataforma redireciona para URL de autorização do MP (`https://auth.mercadopago.com/authorization?client_id=APP_ID...`).
3. Vendedor loga no MP e autoriza.
4. MP redireciona de volta para a Plataforma com um `code`.
5. Backend troca `code` por `access_token`, `refresh_token` e `public_key`.
6. Backend salva credenciais na tabela `mercado_pago_config`.

*Nota: O sistema atual já possui `mercado_pago_config` armazenando `access_token`. Certifique-se de que este token pertence ao vendedor e foi gerado através da sua aplicação MP.*

---

## 2. Fluxo de Pagamento (Checkout Transparente com Split)

### A. Criação da Cobrança (`api/create-payment.ts`)
O backend deve instanciar o pagamento utilizando o **Access Token do Vendedor**, mas injetando a taxa da plataforma.

**Payload para API (`/v1/payments`):**
```json
{
  "transaction_amount": 100.00,
  "description": "Produto X",
  "payment_method_id": "pix",
  "payer": { ... },
  "application_fee": 10.00,  // <--- O PULO DO GATO (Comissão da Plataforma)
  "notification_url": "https://api.goupay.com/webhook"
}
```
*Header:* `Authorization: Bearer <SELLER_ACCESS_TOKEN>`

### B. Processamento
1. O Mercado Pago valida o saldo.
2. Se aprovado:
   - R$ 10,00 vão para a conta da Plataforma (definida no `client_id` da aplicação que gerou o token).
   - O restante (descontando taxas do MP) vai para o Vendedor.

---

## 3. Webhooks (`api/mp-webhook.ts`)
O webhook recebe notificações de mudança de status.

1. **Recebe `payment.updated`** ou **`payment.created`**.
2. Verifica o ID do pagamento.
3. Consulta API do MP para validar status (usando o token do vendedor).
4. **Ações no Banco de Dados:**
   - Atualiza status da venda (`sales.status`).
   - Se aprovado: Libera acesso ao produto/membro.
   - Registra logs financeiros (quanto foi para o vendedor, quanto foi para a plataforma).

---

## 4. Estrutura de Banco de Dados Sugerida

### Tabelas Existentes (Supabase)
- `products`: Produtos à venda.
- `mercado_pago_config`: Credenciais dos vendedores.
- `sales`: Registro das transações.

### Alterações Necessárias
Adicionar colunas na tabela `sales` para auditoria e split:

```sql
ALTER TABLE sales 
ADD COLUMN platform_fee DECIMAL(10,2) DEFAULT 0, -- Quanto a plataforma ganhou
ADD COLUMN seller_net_amount DECIMAL(10,2) DEFAULT 0, -- Quanto o vendedor recebeu (estimado)
ADD COLUMN mp_fee DECIMAL(10,2) DEFAULT 0, -- Taxa do MP (opcional, se a API retornar)
ADD COLUMN release_date TIMESTAMP; -- Data prevista de liberação
```

---

## 5. Segurança e Compliance

1. **Custódia:** A plataforma nunca toca no dinheiro bruto. Isso evita bitributação (imposto sobre o total). A nota fiscal da plataforma para o vendedor é apenas sobre a `platform_fee`.
2. **Dados Sensíveis:** Nunca salvar CVV ou número completo do cartão. Usar o `token` gerado pelo frontend (Mercado Pago JS SDK).
3. **Ambientes:** 
   - Usar Credenciais de Teste (Sandbox) durante o desenvolvimento.
   - Usar Credenciais de Produção apenas no deploy final.
