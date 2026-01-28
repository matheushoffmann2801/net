# NetControl ISP - Sistema de Gestão de Ativos

Sistema profissional para gestão de estoque, ativos (ONUs, Roteadores) e técnicos de campo para provedores de internet (ISP).

## 🚀 Pré-requisitos

- [Node.js](https://nodejs.org/) (Versão 16 ou superior recomendada)
- Gerenciador de pacotes `npm` (já vem com o Node)

## 📦 Instalação Passo a Passo

### 1. Configurar o Backend (Servidor)

O backend utiliza Node.js, Express e Prisma com banco de dados SQLite.

Abra um terminal na pasta `server`:

```bash
cd server
npm install
```

Inicialize o banco de dados:

```bash
npx prisma db push
```

### 2. Configurar o Frontend (Cliente)

O frontend é construído com React, Vite e Tailwind CSS.

Abra um **novo terminal** na pasta `client`:

```bash
cd client
npm install
```

## ▶️ Como Rodar o Sistema

Você precisará manter dois terminais abertos.

**Terminal 1 (Backend):**
```bash
cd server
node index.js
```
*O servidor iniciará na porta 3001.*

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```
*O sistema estará acessível no navegador (geralmente em http://localhost:5173).*

## 🔑 Acesso Padrão

Se for a primeira vez rodando o sistema, o usuário administrador será criado automaticamente:

- **Usuário:** `admin`
- **Senha:** `admin123`

> **Dica:** Se precisar resetar a senha do admin, rode `node reset-admin.js` na pasta `server`.

## 💾 Backup e Restauração

O sistema utiliza um banco de dados SQLite (`dev.db`). Existem duas formas de fazer backup:

### Via Interface (Recomendado)
1. Acesse o menu **Configurações**.
2. Vá até a aba **Sistema & Backup**.
3. Clique em **Baixar Backup** para salvar o arquivo `.db` no seu computador.

### Manualmente
O banco de dados fica localizado em `server/prisma/dev.db`. Você pode copiar esse arquivo manualmente para um local seguro.

## ⚠️ Configuração de Rede (IP)

O sistema está configurado para rodar em rede local. Se o frontend não conseguir conectar ao backend:

1. Verifique o IP da sua máquina (ex: `ipconfig` no Windows).
2. Abra o arquivo `client/src/services/api.js`.
3. Atualize a `baseURL` para o seu IP ou `localhost`:
   ```javascript
   baseURL: 'http://SEU_IP_AQUI:3001/api',
   ```

## 🧹 Manutenção

Para limpar arquivos obsoletos após atualizações do sistema, execute na raiz do projeto:
```bash
node cleanup.js
```"# net" 
