const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuração da Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: {
        maxOutputTokens: 150,
        temperature: 0.7,
    }
});

// Memória dos NPCs (em produção, use um banco de dados)
const memoriaNPCs = {
    aldeao_01: {
        nome: "Velho Sábio",
        personalidade: "Você é um velho sábio que vive nesta vila há 80 anos. É calmo, paciente e gosta de contar histórias sobre o passado. Você tem um bastão de madeira e uma longa barba branca. Fale de forma ponderada e um pouco misteriosa.",
        conhecimentos: [
            "A vila foi fundada há 200 anos por viajantes do leste",
            "Existe uma caverna proibida na floresta norte",
            "As estrelas guiam os destinos dos habitantes"
        ],
        historico: [],
        relacionamento: 0
    },
    aldeao_02: {
        nome: "Guardinha",
        personalidade: "Você é um guarda jovem e entusiasmado, responsável pela segurança da vila. É leal, um pouco desconfiado de estranhos, mas no fundo tem bom coração. Gosta de rotina e ordem.",
        conhecimentos: [
            "Bandidos foram vistos perto da floresta",
            "O mercado abre ao nascer do sol",
            "A ponte leste precisa de reparos"
        ],
        historico: [],
        relacionamento: 0
    }
};

// Rota de saúde
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        servico: 'RPG AI Backend',
        npcs: Object.keys(memoriaNPCs),
        rotas: ['/conversar (POST)', '/iniciativa (POST)', '/status/:npcId (GET)']
    });
});

// Rota principal de conversação
app.post('/conversar', async (req, res) => {
    try {
        const { mensagem, npcId, contexto } = req.body;
        
        if (!mensagem || !npcId) {
            return res.status(400).json({ erro: 'Mensagem e npcId são obrigatórios' });
        }
        
        if (!memoriaNPCs[npcId]) {
            return res.status(404).json({ erro: 'NPC não encontrado' });
        }
        
        const npc = memoriaNPCs[npcId];
        
        // Atualizar histórico (limitar a últimas 10 mensagens)
        npc.historico.push({ role: 'user', content: mensagem, timestamp: new Date().toISOString() });
        if (npc.historico.length > 10) {
            npc.historico = npc.historico.slice(-10);
        }
        
        // Ajustar relacionamento baseado na mensagem
        const palavrasPositivas = ['obrigado', 'por favor', 'ajuda', 'amigo', 'bom', 'ótimo'];
        const palavrasNegativas = ['idiota', 'burro', 'odeio', 'ruim', 'péssimo'];
        
        if (palavrasPositivas.some(palavra => mensagem.toLowerCase().includes(palavra))) {
            npc.relacionamento += 1;
        }
        if (palavrasNegativas.some(palavra => mensagem.toLowerCase().includes(palavra))) {
            npc.relacionamento -= 1;
        }
        
        // Construir prompt contextual
        const contextoHistorico = npc.historico
            .map(entry => `${entry.role === 'user' ? 'Jogador' : npc.nome}: ${entry.content}`)
            .join('\n');
        
        const prompt = `
ROLE: Você é ${npc.nome}, ${npc.personalidade}

CONTEXTO DO JOGO: ${contexto || "Vila medieval durante o dia"}
RELACIONAMENTO COM O JOGADOR: ${npc.relacionamento > 0 ? 'Positivo' : npc.relacionamento < 0 ? 'Negativo' : 'Neutro'}
CONHECIMENTOS IMPORTANTES: ${npc.conhecimentos.join('; ')}

HISTÓRICO RECENTE:
${contextoHistorico}

ÚLTIMA MENSAGEM DO JOGADOR: "${mensagem}"

INSTRUÇÕES:
1. Responda de forma natural, mantendo sua personalidade
2. Seja conciso (1-2 frases)
3. Use conhecimento sobre o mundo quando relevante
4. Reaja ao tom da mensagem do jogador

RESPOSTA DO NPC (apenas o texto da resposta, sem prefixo):
`;
        
        // Gerar resposta com a Gemini
        const result = await model.generateContent(prompt);
        const respostaTexto = result.response.text().trim();
        
        // Adicionar resposta ao histórico
        npc.historico.push({ role: 'assistant', content: respostaTexto, timestamp: new Date().toISOString() });
        
        // Auto-aprendizado: extrair novos conhecimentos
        if (Math.random() > 0.7 && !respostaTexto.includes('?')) {
            const novoConhecimento = await extrairConhecimento(respostaTexto, npc);
            if (novoConhecimento && !npc.conhecimentos.includes(novoConhecimento)) {
                npc.conhecimentos.push(novoConhecimento);
                console.log(`📚 NPC ${npc.nome} aprendeu: ${novoConhecimento}`);
            }
        }
        
        res.json({
            resposta: respostaTexto,
            npc: npc.nome,
            relacionamento: npc.relacionamento,
            conhecimentoCount: npc.conhecimentos.length
        });
        
    } catch (error) {
        console.error('Erro na rota /conversar:', error);
        res.status(500).json({
            erro: 'Erro interno do servidor',
            detalhes: error.message
        });
    }
});

// Rota para iniciativa do NPC
app.post('/iniciativa', async (req, res) => {
    try {
        const { npcId, contexto } = req.body;
        
        if (!memoriaNPCs[npcId]) {
            return res.status(404).json({ erro: 'NPC não encontrado' });
        }
        
        const npc = memoriaNPCs[npcId];
        
        const prompt = `
Você é ${npc.nome}, ${npc.personalidade}

CONTEXTO ATUAL: ${contexto || "O jogador está parado próximo a você"}

Você decide tomar iniciativa e iniciar uma interação. O que você faz ou diz?
Seja criativo e apropriado para o contexto. Resposta curta (1-2 frases).

AÇÃO/DIÁLOGO DO NPC:
`;
        
        const result = await model.generateContent(prompt);
        const respostaTexto = result.response.text().trim();
        
        res.json({
            resposta: respostaTexto,
            npc: npc.nome,
            tipo: "iniciativa"
        });
        
    } catch (error) {
        console.error('Erro na rota /iniciativa:', error);
        res.status(500).json({ erro: 'Erro ao gerar iniciativa' });
    }
});

// Rota para status do NPC
app.get('/status/:npcId', (req, res) => {
    const npc = memoriaNPCs[req.params.npcId];
    
    if (!npc) {
        return res.status(404).json({ erro: 'NPC não encontrado' });
    }
    
    res.json({
        nome: npc.nome,
        personalidade: npc.personalidade.substring(0, 100) + '...',
        conhecimentos: npc.conhecimentos,
        relacionamento: npc.relacionamento,
        interacoes: npc.historico.length
    });
});

// Função para auto-aprendizado
async function extrairConhecimento(texto, npc) {
    try {
        const prompt = `
Analise o seguinte diálogo do NPC "${npc.nome}" e extraia UM fato ou informação sobre o mundo do jogo que possa ser armazenado como conhecimento.
Se não houver informação nova, responda apenas com "null".

DIÁLOGO: "${texto}"

FATO EXTRAÍDO (apenas o fato, sem explicações):
`;
        
        const result = await model.generateContent(prompt);
        const conhecimento = result.response.text().trim();
        
        return conhecimento !== 'null' ? conhecimento : null;
    } catch (error) {
        console.error('Erro no auto-aprendizado:', error);
        return null;
    }
}

// Iniciar servidor
app.listen(port, () => {
    console.log(`🚀 Servidor de IA rodando na porta ${port}`);
    console.log(`📡 Endpoints disponíveis:`);
    console.log(`   GET  /           - Status do servidor`);
    console.log(`   POST /conversar  - Conversar com NPC`);
    console.log(`   POST /iniciativa - NPC toma iniciativa`);
    console.log(`   GET /status/:id  - Status do NPC`);
});