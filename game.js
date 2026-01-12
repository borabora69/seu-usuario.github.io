const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: { default: 'arcade' },
    plugins: { scene: [{ key: 'gridEngine', plugin: GridEngine, mapping: 'gridEngine' }] },
    scene: { preload, create, update }
};
const game = new Phaser.Game(config);
let gridEngine;
let hero;
let apiBaseUrl = "https://seu-usuario-github-io.onrender.com"; // SUBSTITUA PELA URL DO SEU BACKEND

function preload() {
    // Carrega um tileset simples (substitua pela URL da sua imagem)
    this.load.image('tiles', 'https://i.imgur.com/gKZ9aYp.png');
    this.load.spritesheet('hero', 'https://i.imgur.com/pDzqPqC.png', { frameWidth: 16, frameHeight: 24 });
}

function create() {
    const tilemap = this.make.tilemap({ key: 'tilemap', tileWidth: 16, tileHeight: 16 });
    const tileset = tilemap.addTilesetImage('tiles');
    const layer = tilemap.createLayer(0, tileset, 0, 0);

    // Cria o herói
    hero = this.physics.add.sprite(0, 0, 'hero');
    hero.setOrigin(0, 0);

    // Configura o Grid Engine para movimento em grade
    gridEngine.create(tilemap, {
        characters: [{ id: "hero", sprite: hero, startPosition: { x: 5, y: 5 } }],
    });

    // Criações de animação básicas (opcional)
    ['left', 'right', 'up', 'down'].forEach(dir => {
        this.anims.create({ key: dir, frames: this.anims.generateFrameNumbers('hero', { start: 0, end: 2 }), frameRate: 10, repeat: -1 });
    });

    // Tecla E para interagir
    this.input.keyboard.on('keydown-E', async () => {
        const facingPosition = getTileInFront(hero, gridEngine.getFacingDirection("hero"));
        // Aqui você verificaria se há um NPC na posição 'facingPosition'
        const respostaNPC = await conversarComNPC("Olá, como você está?");
        console.log("NPC diz:", respostaNPC);
        // Adicione lógica para exibir a resposta na tela (caixa de diálogo)
    });
}

function update() {
    const cursors = this.input.keyboard.createCursorKeys();
    if (cursors.left.isDown) gridEngine.move("hero", "left");
    else if (cursors.right.isDown) gridEngine.move("hero", "right");
    else if (cursors.up.isDown) gridEngine.move("hero", "up");
    else if (cursors.down.isDown) gridEngine.move("hero", "down");
}

// Função auxiliar para pegar tile à frente
function getTileInFront(sprite, direction) {
    const pos = { x: sprite.x, y: sprite.y };
    if (direction === 'left') pos.x -= 16;
    else if (direction === 'right') pos.x += 16;
    else if (direction === 'up') pos.y -= 16;
    else if (direction === 'down') pos.y += 16;
    return { x: Math.floor(pos.x / 16), y: Math.floor(pos.y / 16) };
}

// Função que chama o backend da IA
async function conversarComNPC(mensagemDoJogador) {
    try {
        const resposta = await fetch(`${apiBaseUrl}/conversar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mensagem: mensagemDoJogador,
                npcId: "aldeao_01", // Identifique diferentes NPCs
                contexto: "Vila Inicial, dia"
            })
        });
        const dados = await resposta.json();
        return dados.resposta;
    } catch (erro) {
        console.error("Erro ao falar com NPC:", erro);
        return "O NPC está pensando...";
    }
}
