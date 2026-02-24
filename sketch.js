let lm = 30, tm = 30;
let sideLength = 60;
let board = [];

let snakes = { 32: 10, 36: 6, 48: 26, 62: 18, 88: 24, 95: 56, 97: 78 };
let ladders = { 4: 14, 8: 30, 21: 42, 28: 76, 50: 67, 71: 92, 80: 99 };

let snakeCoords = [];
let ladderCoords = [];

let maxPlayers = 8;

// Players are now objects to track Visual (vX) and Target (tX) coordinates
let players = {
    // 0: { name: "A", pos: 1, vX: null, vY: null, tX: 0, tY: 0 },
    // 1: { name: "B", pos: 1, vX: null, vY: null, tX: 0, tY: 0 },
    // 2: { name: "C", pos: 1, vX: null, vY: null, tX: 0, tY: 0 },
    // 3: { name: "D", pos: 1, vX: null, vY: null, tX: 0, tY: 0 }
};
let playerCount = 0;

let gameState = "MENU"; // "MENU", "PLAYING", "ANIMATING", "GAMEOVER"
let dice;
let currentPlayer = 0;
let winners = [];
let activeAnim = null; // Stores current animation sequence

let playerNameInput, addPlayerButton, playGameButton, restartButton, rollDiceButton;

class Cell {
    constructor(x, y, pos) {
        this.x = x;
        this.y = y;
        this.pos = pos;
    }
    showPosition() {
        fill(255); noStroke(); textAlign(RIGHT); textSize(12); textStyle(NORMAL);
        text(this.pos, this.x + sideLength / 2 + 20, this.y + sideLength / 2 - 25, 5);
    }
}

class Dice {
    constructor(x, y, sl) {
        this.x = x; this.y = y; this.sl = sl; this.n = 1;
    }
    show() {
        rectMode(CENTER); noFill(); stroke(255); strokeWeight(1);
        square(this.x, this.y, this.sl);
        let x = this.x, y = this.y;

        fill(255); noStroke();
        switch (this.n) {
            case 1: circle(x, y, 15); break;
            case 2: circle(x - 10, y, 10); circle(x + 10, y, 10); break;
            case 3: circle(x + 10, y - 10, 8); circle(x, y, 8); circle(x - 10, y + 10, 8); break;
            case 4: circle(x - 8, y - 8, 8); circle(x + 8, y - 8, 8); circle(x - 8, y + 8, 8); circle(x + 8, y + 8, 8); break;
            case 5: circle(x - 10, y - 10, 6); circle(x + 10, y - 10, 6); circle(x, y, 6); circle(x - 10, y + 10, 6); circle(x + 10, y + 10, 6); break;
            case 6: circle(x - 10, y - 10, 5); circle(x + 10, y - 10, 5); circle(x - 10, y, 5); circle(x + 10, y, 5); circle(x - 10, y + 10, 5); circle(x + 10, y + 10, 5); break;
        }
    }
}

function getCellCenter(pos) {
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            if (board[i][j].pos === pos) return { x: board[i][j].x + sideLength / 2, y: board[i][j].y + sideLength / 2 };
        }
    }
    return { x: 0, y: 0 };
}

function setup() {
    let canvas = createCanvas(650, 750);
    canvas.parent('game-container');

    // 1. Generate Board
    let lmp = [100, 81, 80, 61, 60, 41, 40, 21, 20, 1];
    let lmi = 0;
    let pos;
    for (let i = 0; i < 10; i++) {
        board[i] = [];
        pos = lmp[lmi];
        for (let j = 0; j < 10; j++) {
            board[i][j] = new Cell(j * sideLength + tm, i * sideLength + lm, pos);
            pos += (lmp[lmi] % 2 == 0) ? -1 : 1;
        }
        lmi++;
    }

    // 2. Precompute Snakes & Ladders
    for (let snakeHead in snakes) {
        let startCell = getCellCenter(Number(snakeHead));
        let endCell = getCellCenter(snakes[snakeHead]);
        snakeCoords.push({ x1: startCell.x, y1: startCell.y, x2: endCell.x, y2: endCell.y });
    }
    for (let ladderBase in ladders) {
        let startCell = getCellCenter(Number(ladderBase));
        let endCell = getCellCenter(ladders[ladderBase]);
        ladderCoords.push({ x1: startCell.x, y1: startCell.y, x2: endCell.x, y2: endCell.y });
    }

    dice = new Dice(width / 2, tm + 10 * sideLength + 55, 40);

    // --- DOM ELEMENTS ---
    playerNameInput = createInput();
    playerNameInput.parent('game-container');
    playerNameInput.position(width / 2 - 75, height / 2 - 75);
    playerNameInput.attribute('placeholder', 'Player Name');
    playerNameInput.addClass('game-input');
    playerNameInput.size(110); // Replaces inline CSS width

    addPlayerButton = createButton('+');
    addPlayerButton.parent('game-container');
    addPlayerButton.position(width / 2 + 65, height / 2 - 75);
    addPlayerButton.addClass('game-btn add-btn');
    addPlayerButton.mousePressed(() => {
        let newPlayerName = playerNameInput.value().trim();
        if (newPlayerName != '' && playerCount < maxPlayers) {
            players[playerCount] = { name: newPlayerName, pos: 1, vX: null, vY: null, tX: 0, tY: 0 };
            playerCount++;
            playerNameInput.value('');
            playerNameInput.elt.focus(); // Keeps the cursor in the input box for fast typing!
        }
    });

    playGameButton = createButton('PLAY');
    playGameButton.parent('game-container');
    playGameButton.position(width / 2 - 38, height / 2 - 15);
    playGameButton.addClass('game-btn primary-btn'); // Primary yellow style
    playGameButton.mousePressed(() => {
        if (playerCount > 1) {
            gameState = "PLAYING";
            addPlayerButton.hide(); playerNameInput.hide(); playGameButton.hide();
            restartButton.show(); rollDiceButton.show();
        }
    });

    restartButton = createButton("RESTART");
    restartButton.parent('game-container');
    restartButton.hide();
    restartButton.position(width - 110, height - 45);
    restartButton.addClass('game-btn');
    restartButton.mousePressed(() => {
        playerCount = 0; players = {}; winners = [];
        gameState = "MENU"; currentPlayer = 0; activeAnim = null;
        addPlayerButton.show(); playerNameInput.show(); playGameButton.show();
        rollDiceButton.hide(); restartButton.hide();
    });

    rollDiceButton = createButton("Roll Dice");
    rollDiceButton.parent('game-container');
    rollDiceButton.hide();
    rollDiceButton.position(width / 2 - 55, tm + 10 * sideLength + 85);
    rollDiceButton.addClass('game-btn primary-btn'); // Primary yellow style
    rollDiceButton.mousePressed(() => {
        // (Keep your existing rollDiceButton logic inside here!)
        if (gameState !== "PLAYING") return;

        let newRolledValue = floor(random(1, 7));
        dice.n = newRolledValue;

        let startPos = players[currentPlayer].pos;

        if (startPos + newRolledValue <= 100) {
            rollDiceButton.hide();
            let destPos = startPos + newRolledValue;
            let seq = [];

            for (let i = startPos + 1; i <= destPos; i++) {
                let center = getCellCenter(i);
                seq.push({ type: 'line', target: i, x: center.x, y: center.y });
            }

            players[currentPlayer].pos = destPos;

            if (snakes[destPos]) {
                players[currentPlayer].pos = snakes[destPos];
                let head = getCellCenter(destPos);
                let tail = getCellCenter(snakes[destPos]);
                seq.push({ type: 'snake', target: snakes[destPos], x1: head.x, y1: head.y, x2: tail.x, y2: tail.y });
            } else if (ladders[destPos]) {
                players[currentPlayer].pos = ladders[destPos];
                let top = getCellCenter(ladders[destPos]);
                seq.push({ type: 'ladder', target: ladders[destPos], x: top.x, y: top.y });
            }

            gameState = "ANIMATING";
            activeAnim = { player: currentPlayer, seq: seq, step: 0, t: 0, startPos: startPos };
        } else {
            passTurn();
        }
    });
}

function passTurn() {
    if (dice.n != 6) {
        do {
            currentPlayer = (currentPlayer + 1) % playerCount;
        } while (players[currentPlayer].pos === 100 && winners.length < playerCount - 1);
    }

    if (winners.length >= playerCount - 1) {
        gameState = "GAMEOVER";
        rollDiceButton.hide();
    } else {
        gameState = "PLAYING";
        rollDiceButton.show();
    }
}

function handleAnimation() {
    if (!activeAnim) return;

    let p = activeAnim.player;
    let currentStep = activeAnim.seq[activeAnim.step];

    // Animation speeds
    if (currentStep.type === 'line') activeAnim.t += 0.15; // fast steps
    else if (currentStep.type === 'ladder') activeAnim.t += 0.03; // slide up
    else if (currentStep.type === 'snake') activeAnim.t += 0.02; // slide down

    if (activeAnim.t >= 1) {
        activeAnim.t = 0;
        players[p].vX = (currentStep.type === 'snake') ? currentStep.x2 : currentStep.x;
        players[p].vY = (currentStep.type === 'snake') ? currentStep.y2 : currentStep.y;
        activeAnim.step++;
    } else {
        let startPoint = (activeAnim.step === 0) ? getCellCenter(activeAnim.startPos) :
            (activeAnim.seq[activeAnim.step - 1].type === 'snake') ?
                { x: activeAnim.seq[activeAnim.step - 1].x2, y: activeAnim.seq[activeAnim.step - 1].y2 } :
                { x: activeAnim.seq[activeAnim.step - 1].x, y: activeAnim.seq[activeAnim.step - 1].y };

        if (currentStep.type === 'line' || currentStep.type === 'ladder') {
            players[p].vX = lerp(startPoint.x, currentStep.x, activeAnim.t);
            players[p].vY = lerp(startPoint.y, currentStep.y, activeAnim.t);
        } else if (currentStep.type === 'snake') {
            // Track the exact same Bezier curve drawn on the board
            players[p].vX = bezierPoint(currentStep.x1, currentStep.x1, currentStep.x2, currentStep.x2, activeAnim.t);
            players[p].vY = bezierPoint(currentStep.y1, currentStep.y2, currentStep.y1, currentStep.y2, activeAnim.t);
        }
    }

    // Sequence Finished
    if (activeAnim.step >= activeAnim.seq.length) {
        if (players[p].pos == 100 && !winners.includes(players[p].name)) {
            winners.push(players[p].name);
        }
        activeAnim = null;
        passTurn();
    }
}

function draw() {
    background(31, 78, 121);

    if (gameState === "PLAYING" || gameState === "ANIMATING") {
        if (gameState === "ANIMATING") handleAnimation();
        drawBoard();
        dice.show();
    } else if (gameState === "MENU") drawMenu();
    else if (gameState === "GAMEOVER") { drawBoard(); drawGameOver(); }
}

function drawBoard() {
    // 1. Draw Grid Lines
    stroke(255); strokeWeight(1);
    for (let i = 0; i <= 10; i++) {
        for (let j = 0; j <= 10; j++) { fill(255); noStroke(); circle(lm + i * sideLength, tm + j * sideLength, 6); }
        stroke(255);
        line(lm, i * sideLength + tm, 10 * sideLength + lm, i * sideLength + tm);
        line(i * sideLength + tm, tm, i * sideLength + tm, 10 * sideLength + lm);
    }
    for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) board[i][j].showPosition();

    // 2. Draw Snakes & Ladders
    for (let s of snakeCoords) {
        noFill(); strokeWeight(4); stroke(255, 150);
        bezier(s.x1, s.y1, s.x1, s.y2, s.x2, s.y1, s.x2, s.y2);
        fill(255, 100); noStroke(); circle(s.x1, s.y1, 15);
    }
    for (let l of ladderCoords) {
        stroke(255, 200); strokeWeight(2); drawingContext.setLineDash([10]);
        let gap = 10;
        line(l.x1, l.y1 - gap, l.x2, l.y2 - gap);
        line(l.x1, l.y1 + gap, l.x2, l.y2 + gap);
        drawingContext.setLineDash([]);
    }

    // 3. Bottom Player Stats
    let spacing = (width - (lm * 2)) / playerCount;
    textAlign(CENTER); noStroke(); textSize(14);
    for (let i = 0; i < playerCount; i++) {
        let px = lm + (spacing * i) + (spacing / 2);
        let py = tm + 10 * sideLength + 20;

        if (players[i].pos === 100) {
            fill(150); textStyle(NORMAL); text(players[i].name + " [DONE]", px, py);
        } else if (i == currentPlayer && (gameState === "PLAYING" || gameState === "ANIMATING")) {
            fill(255, 255, 0); textStyle(BOLD); text("> " + players[i].name + " [" + players[i].pos + "]", px, py);
        } else {
            fill(255); textStyle(NORMAL); text(players[i].name + " [" + players[i].pos + "]", px, py);
        }
    }

    // 4. Calculate 2x4 Grid Resting Targets
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            let tokensInCell = [];
            for (let p in players) if (board[i][j].pos == players[p].pos) tokensInCell.push(p);

            for (let t = 0; t < tokensInCell.length; t++) {
                let pIndex = tokensInCell[t];
                let row = floor(t / 4), col = t % 4;
                let xOff = -15 + (col * 10), yOff = (row === 0) ? -2 : 12;
                players[pIndex].tX = board[i][j].x + sideLength / 2 + xOff;
                players[pIndex].tY = board[i][j].y + sideLength / 2 + yOff;
            }
        }
    }

    // 5. Draw Player Tokens
    for (let p in players) {
        // Initialize position on first frame
        if (players[p].vX === null) { players[p].vX = players[p].tX; players[p].vY = players[p].tY; }

        // If they are not currently animating a path, slide them gently toward their grid slot
        if (!(gameState === "ANIMATING" && activeAnim && activeAnim.player == p)) {
            players[p].vX = lerp(players[p].vX, players[p].tX, 0.2);
            players[p].vY = lerp(players[p].vY, players[p].tY, 0.2);
        }

        fill(245, 245, 0); textSize(16); textStyle(BOLD); textAlign(CENTER);
        text(players[p].name[0], players[p].vX, players[p].vY);
    }
}

function drawMenu() {
    textAlign(CENTER); fill(255);
    textSize(20); textStyle(NORMAL); text("Welcome To", width / 2, height / 2 - 230);
    textSize(35); textStyle(BOLD); text("Snakes And Ladders", width / 2, height / 2 - 180);
    textSize(20); textStyle(NORMAL); text("Add Players (Max 8)", width / 2, height / 2 - 100);

    let displayedPlayer = "";
    for (let p in players) displayedPlayer += "[" + players[p].name[0] + "]  " + players[p].name + "\n";
    textSize(18); textAlign(LEFT); text(displayedPlayer, width / 2 - 50, height / 2 + 70);
}

function drawGameOver() {
    fill(0, 0, 0, 180); rectMode(CORNER); rect(0, 0, width, height);
    textAlign(CENTER);
    fill(255, 215, 0); textSize(40); textStyle(BOLD); text("GAME OVER!", width / 2, height / 2 - 50);

    fill(255); textSize(24); textStyle(NORMAL);
    text("First Place: " + winners[0], width / 2, height / 2 + 10);

    if (winners.length > 1) {
        textSize(18); fill(200);
        let runnerUps = "Runners Up: ";
        for (let i = 1; i < winners.length; i++) runnerUps += winners[i] + (i === winners.length - 1 ? "" : ", ");
        text(runnerUps, width / 2, height / 2 + 40);
    }
}