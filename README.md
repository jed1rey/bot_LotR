# 🤖 Bot WhatsApp + LM Studio

Projeto desenvolvido por **Paula Abib** para a disciplina **Processamento de Linguagem Natural** da **Fatec Franca**.

Este bot conecta o **WhatsApp** ao **LM Studio**, permitindo que o modelo local responda a mensagens automaticamente com base em arquivos de conhecimento sobre **O Senhor dos Anéis**.

---

## 🧩 Tecnologias Utilizadas
- Node.js  
- Baileys (`@whiskeysockets/baileys`)  
- LM Studio  
- Axios  
- QRCode Terminal  
- Pino  

---

## ⚙️ Como Executar

1️⃣ Instale as dependências:  
```bash
npm install
```
2️⃣ Abra o LM Studio, inicie o servidor local e carregue o modelo:
```bash
openai/gpt-oss-20b
```
3️⃣ Execute o bot:
```bash
node bot.js
```
4️⃣ Escaneie o QR Code exibido no terminal com o WhatsApp do número autorizado.

5️⃣ Envie mensagens a partir do número autorizado para conversar com o bot.

## 🧠 Funcionalidades

- Conecta automaticamente ao WhatsApp.
- Suporta múltiplos arquivos de conhecimento em .txt ou .json.
- Mantém histórico de conversas.
- Se reconecta automaticamente em caso de desconexão.

Desenvolvido por Paula Cristina Abib Teixeira — Fatec Franca
Disciplina: Processamento de Linguagem Natural (PLN)
