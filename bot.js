/**
 * BOT WhatsApp + LMStudio
 * Autor: Paula Abib
 *
 * Dependências:
 * npm install @whiskeysockets/baileys@6.6.0
 * npm install qrcode-terminal
 * npm install pino
 * npm install @hapi/boom
 * npm install axios
 */

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const pino = require('pino')
const qrcode = require('qrcode-terminal')
const axios = require('axios')
const fs = require('fs')
const path = require('path')

// ===========================
// CONFIGURAÇÕES GERAIS
// ===========================
const lmstudioUrl = 'http://127.0.0.1:1234' // Endereço do LMStudio
const conversationHistory = new Map()
const KNOWLEDGE_FOLDER = path.join(__dirname, 'knowledge')

// Apenas números autorizados podem falar com o bot
const numerosAutorizados = [
  '5516992362793',
  '5516994233352' // seu número (adicione outros se quiser)
]

console.log('🤖 Bot com LMStudio iniciando...')
console.log(`📱 Autorizados: ${numerosAutorizados.join(', ')}\n`)

// ===========================
// CARREGAR BASE DE CONHECIMENTO
// ===========================
function carregarBaseConhecimento() {
  console.log('📚 Carregando base de conhecimento...')
  if (!fs.existsSync(KNOWLEDGE_FOLDER)) {
    fs.mkdirSync(KNOWLEDGE_FOLDER, { recursive: true })
    console.log('📁 Pasta "knowledge" criada. Adicione seus arquivos nela!')
    return ''
  }

  let conteudoCompleto = ''
  const arquivos = fs.readdirSync(KNOWLEDGE_FOLDER)

  arquivos.forEach((arquivo) => {
    if (arquivo.endsWith('.txt') || arquivo.endsWith('.json')) {
      const filePath = path.join(KNOWLEDGE_FOLDER, arquivo)
      const conteudo = fs.readFileSync(filePath, 'utf-8')
      conteudoCompleto += `\n=== ${arquivo} ===\n${conteudo}\n`
    }
  })

  console.log(`✅ ${arquivos.length} arquivos carregados.`)
  return conteudoCompleto
}

const conhecimento = carregarBaseConhecimento()

// ===========================
// CONECTAR AO WHATSAPP
// ===========================
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['LMStudio Bot', 'Chrome', '1.0']
  })

  sock.ev.on('creds.update', saveCreds)

  // ===========================
  // ATUALIZAÇÃO DE CONEXÃO
  // ===========================
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('📱 Escaneie este QR code para conectar:')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log('✅ Conectado ao WhatsApp com sucesso!')
      // Testar conexão ao LMStudio
      axios
        .get(`${lmstudioUrl}/v1/models`, { timeout: 5000 })
        .then(() => console.log('🧠 LMStudio online e pronto!'))
        .catch(() => console.log('⚠️ Não foi possível conectar ao LMStudio. Inicie-o manualmente.'))
    } else if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
      console.log(`[WhatsApp] Conexão fechada. Motivo: ${reason}`)
      if (reason !== DisconnectReason.loggedOut) {
        console.log('🔁 Tentando reconectar...')
        connectToWhatsApp()
      } else {
        console.log('❌ Sessão encerrada. Apague a pasta "auth_info_baileys" e reconecte.')
      }
    }
  })

  // ===========================
  // RECEBENDO MENSAGENS
  // ===========================
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const numero = from.split('@')[0]
    const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || ''

    console.log(`📩 Mensagem de ${numero}: ${texto}`)

    // Checar se o número está autorizado
    if (!numerosAutorizados.includes(numero)) {
      console.log(`⛔ Número ${numero} não autorizado.`)
      return
    }

    try {
      // Verificar LMStudio
      const online = await axios
        .get(`${lmstudioUrl}/v1/models`, { timeout: 3000 })
        .then(() => true)
        .catch(() => false)

      if (!online) {
        await sock.sendMessage(from, { text: '⚠️ O LMStudio não está ativo. Abra o LMStudio e tente novamente.' })
        return
      }

      // Histórico de conversa
      const historico = conversationHistory.get(from) || []

      let systemMessage = 'Você é um assistente útil que responde em português brasileiro.'
      if (conhecimento) {
        systemMessage += `\n\nBase de Conhecimento:\n${conhecimento}`
        systemMessage += '\n\nUse essas informações para responder perguntas sobre O Senhor dos Anéis.'
      }

      const mensagensParaIA = [
        { role: 'system', content: systemMessage },
        ...historico,
        { role: 'user', content: texto }
      ]

      // Requisição ao LMStudio
      const respostaIA = await axios.post(
        `${lmstudioUrl}/v1/chat/completions`,
        {
          model: 'openai/gpt-oss-20b', // ✅ modelo correto do LM Studio
          messages: mensagensParaIA,
          temperature: 0.4,
          max_tokens: 400
        },
        { timeout: 30000 }
      )

      const resposta = respostaIA.data.choices[0].message.content

      historico.push({ role: 'user', content: texto })
      historico.push({ role: 'assistant', content: resposta })
      if (historico.length > 20) historico.splice(0, 4)
      conversationHistory.set(from, historico)

      await sock.sendMessage(from, { text: resposta })
      console.log(`🤖 IA respondeu: ${resposta}`)
    } catch (erro) {
      console.error('❌ Erro ao processar mensagem:', erro.message)
      await sock.sendMessage(from, { text: 'Ocorreu um erro. Tente novamente mais tarde.' })
    }
  })
}

// ===========================
// INICIAR BOT
// ===========================
connectToWhatsApp()
