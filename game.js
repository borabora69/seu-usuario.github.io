// CONFIGURAÇÃO - ⚠️ SUBSTITUA PELA SUA URL DO RENDER ⚠️
const API_BASE_URL = "https://seu-usuario-github-io.onrender.com";
// Exemplo: "https://meu-rpg-backend.onrender.com"

// Configuração do Phaser
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#2d2d2d',
    pixelArt: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// Variáveis globais
let player;
let npcs = [];
let cursors;
let interactKey;
let initiativeKey;
let dialogActive = false;
let npcAtual = null;

// NPCs configuráveis
const npcConfigs = [
    {
        id: "aldeao_01",
        name: "Velho Sábio",
        x: 300,
        y: 200,
        color: 0x8b4513,
        personality: "Um velho sábio que conhece todos os segredos da vila"
    },
    {
        id: "aldeao_02",
        name: "Guardinha",
        x: 500,
        y: 300,
        color: 0x228b22,
        personality: "Um guarda vigilante mas amigável"
    }
];

function preload() {
    // Carregar assets básicos
    this.load.image('tiles', 'https://i.imgur.com/gKZ9aYp.png');
    this.load.spritesheet('player', 'https://i.imgur.com/pDzqPqC.png', {
        frameWidth: 16,
        frameHeight: 24
    });
    
    // Criar tilemap simples
    const mapData = {
        width: 20,
        height: 15,
        tilewidth: 32,
        tileheight: 32,
        layers: [{
            name: "ground",
            data: Array(20 * 15).fill(1)
        }],
        tilesets: [{
            firstgid: 1,
            image: 'tiles'
        }]
    };
    
    this.cache.tilemap.entries.set('map', {
        format: Phaser.Tilemaps.Formats.JSON,
        data: mapData
    });
}

function create() {
    // Criar mapa
    const map = this.make.tilemap({ key: 'map', tileWidth: 32, tileHeight: 32 });
    const tileset = map.addTilesetImage('tiles');
    const layer = map.createLayer(0, tileset, 0, 0);
    
    // Criar jogador
    player = this.physics.add.sprite(400, 300, 'player');
    player.setCollideWorldBounds(true);
    player.setScale(2);
    
    // Criar NPCs
    npcConfigs.forEach(config => {
        const npc = this.add.circle(config.x, config.y, 15, config.color);
        npc.setData({
            id: config.id,
            name: config.name,
            personality: config.personality
        });
        
        // Adicionar física para colisão
        this.physics.add.existing(npc);
        npc.body.setCircle(15);
        this.physics.add.collider(player, npc);
        
        // Adicionar texto do nome
        const nomeTexto = this.add.text(config.x, config.y - 25, config.name, {
            fontSize: '12px',
            fill: '#ffffff',
            backgroundColor: '#00000080',
            padding: { x: 5, y: 2 }
        });
        nomeTexto.setOrigin(0.5);
        
        npcs.push({ graphic: npc, text: nomeTexto });
    });
    
    // Animações do jogador
    this.anims.create({
        key: 'down',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 2 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'left',
        frames: this.anims.generateFrameNumbers('player', { start: 12, end: 14 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'right',
        frames: this.anims.generateFrameNumbers('player', { start: 24, end: 26 }),
        frameRate: 10,
        repeat: -1
    });
    this.anims.create({
        key: 'up',
        frames: this.anims.generateFrameNumbers('player', { start: 36, end: 38 }),
        frameRate: 10,
        repeat: -1
    });
    
    // Controles
    cursors = this.input.keyboard.createCursorKeys();
    interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    initiativeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    
    // Texto de instruções
    this.add.text(10, 10, 'RPG com IA - NPC Inteligente', {
        fontSize: '24px',
        fill: '#00d4ff',
        fontStyle: 'bold'
    }).setShadow(2, 2, '#000000', 2);
    
    // Detectar teclas
    this.input.keyboard.on('keydown-E', () => {
        if (!dialogActive) {
            verificarNPCProximo(this);
        }
    });
    
    this.input.keyboard.on('keydown-R', () => {
        if (!dialogActive) {
            pedirIniciativaNPC();
        }
    });
}

function update() {
    if (dialogActive) return;
    
    // Movimentação do jogador
    const speed = 200;
    player.setVelocity(0);
    
    if (cursors.left.isDown) {
        player.setVelocityX(-speed);
        player.anims.play('left', true);
    } else if (cursors.right.isDown) {
        player.setVelocityX(speed);
        player.anims.play('right', true);
    }
    
    if (cursors.up.isDown) {
        player.setVelocityY(-speed);
        player.anims.play('up', true);
    } else if (cursors.down.isDown) {
        player.setVelocityY(speed);
        player.anims.play('down', true);
    }
    
    if (player.body.velocity.x === 0 && player.body.velocity.y === 0) {
        player.anims.stop();
    }
    
    // Atualizar posição dos textos dos NPCs
    npcs.forEach(npc => {
        npc.text.setPosition(npc.graphic.x, npc.graphic.y - 25);
    });
}

function verificarNPCProximo(scene) {
    let npcMaisProximo = null;
    let menorDistancia = 100;
    
    npcs.forEach(npc => {
        const distancia = Phaser.Math.Distance.Between(
            player.x, player.y,
            npc.graphic.x, npc.graphic.y
        );
        
        if (distancia < menorDistancia) {
            menorDistancia = distancia;
            npcMaisProximo = npc;
        }
    });
    
    if (npcMaisProximo && menorDistancia < 60) {
        npcAtual = npcMaisProximo.graphic.getData('id');
        const nomeNPC = npcMaisProximo.graphic.getData('name');
        
        mostrarDialogo(`Interagindo com ${nomeNPC}...`);
        conversarComNPC(`Olá ${nomeNPC}, como vai você?`);
        dialogActive = true;
        
        return true;
    }
    
    mostrarDialogo("Não há ninguém por perto para interagir");
    setTimeout(() => fecharDialogo(), 2000);
    return false;
}

async function conversarComNPC(mensagem) {
    try {
        mostrarDialogo("💭 NPC está pensando...");
        
        const resposta = await fetch(`${API_BASE_URL}/conversar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mensagem: mensagem,
                npcId: npcAtual || "aldeao_01",
                contexto: "Vila Central, dia ensolarado"
            })
        });
        
        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }
        
        const dados = await resposta.json();
        
        if (dados.erro) {
            mostrarDialogo(`Erro: ${dados.erro}`);
        } else {
            mostrarDialogo(`${npcConfigs.find(n => n.id === npcAtual)?.name || "NPC"}: ${dados.resposta}`);
        }
    } catch (erro) {
        console.error("Erro na conversa:", erro);
        mostrarDialogo("NPC está offline ou pensando muito...");
    }
}

async function pedirIniciativaNPC() {
    try {
        mostrarDialogo("Aguardando iniciativa do NPC...");
        
        const resposta = await fetch(`${API_BASE_URL}/iniciativa`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                npcId: "aldeao_01",
                contexto: "O jogador está parado observando"
            })
        });
        
        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }
        
        const dados = await resposta.json();
        
        if (dados.erro) {
            mostrarDialogo(`Erro: ${dados.erro}`);
        } else {
            mostrarDialogo(`🧠 NPC toma iniciativa: ${dados.resposta}`);
            dialogActive = true;
        }
    } catch (erro) {
        console.error("Erro na iniciativa:", erro);
        mostrarDialogo("NPC não tomou iniciativa agora");
    }
}

// Funções globais para o diálogo
window.conversarComNPC = conversarComNPC;
window.mostrarDialogo = mostrarDialogo;
window.fecharDialogo = function() {
    dialogActive = false;
    document.getElementById('dialog-box').classList.remove('active');
};
