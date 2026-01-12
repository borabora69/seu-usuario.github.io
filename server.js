const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Permite requisições do seu site GitHub Pages
app.use(express.json());

// Configuração da Gemini. SUA CHAVE DEVE SER CONFIGURADA COMO VARIÁVEL DE AMBIENTE.
const genAI = new GoogleGenerativeAI(process.env.AIzaSyD8SlF_2C2PMqWgS5KugGhtg3wxKV37nI4); //[citation:5]
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Memória simples (em um projeto real, use um banco de dados)
let memoriaNPC = {
    aldeao_01: {
        personalidade: "Você é um aldeão curioso e prestativo de uma vila medieval. Fala de forma simples e amigável.",
        historico: []
    }
};

// Rota principal para conversar
app.post('/conversar', async (req, res) => {
    const { mensagem, npcId, contexto } = req.body;

    if (!memoriaNPC[npcId]) {
        return res.status(404).json({ erro: 'NPC não encontrado' });
    }

    const npc = memoriaNPC[npcId];

    // 1. Monta o prompt com personalidade e histórico
    const prompt = `
${npc.personalidade}
Contexto do jogo: ${contexto}.

Histórico recente da conversa:
${npc.historico.slice(-5).map(entry => `${entry.autor}: ${entry.texto}`).join('\n')}

Jogador diz: "${mensagem}"

Como você responde? Seja conciso.`;

    try {
        // 2. Chama a API Gemini[citation:9]
        const result = await model.generateContent(prompt);
        const respostaTexto = result.response.text();

        // 3. Atualiza a memória (autoatualização simples)
        npc.historico.push({ autor: "Jogador", texto: mensagem });
        npc.historico.push({ autor: "NPC", texto: respostaTexto });

        // 4. Retorna a resposta para o jogo
        res.json({ resposta: respostaTexto });

    } catch (erro) {
        console.error('Erro na Gemini API:', erro);
        res.status(500).json({ erro: 'Falha ao gerar resposta' });
    }
});

// Rota para o NPC tomar iniciativa (opcional)
app.post('/iniciativa', async (req, res) => {
    const { npcId, contexto } = req.body;
    const npc = memoriaNPC[npcId];

    const prompt = `${npc.personalidade} Contexto: ${contexto}. Você está sozinho. O que você faz ou diz? Seja breve.`;
    // ... (lógica similar à rota /conversar)
});

app.listen(port, () => console.log(`Servidor de IA rodando na porta ${port}`));