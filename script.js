const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let aiscore = 0;
let streak = 0;
let paused = false;
let gameOver = false;
let muted = false;
let twoPlayerMode = false;
let pulseTimer = 0;
let volume = 50;
let sensitivity = 50;
let winningScore = 10;

let settings = {
    muted: false,
    aiDifficulty: 'normal',
    twoPlayerMode: false,
    sensitivity: 0.5,
    winningScore: 10
};

function saveSettings() {
    localStorage.setItem('pongSettings', JSON.stringify(settings));
}

const difficultySettings = {
    easy: { leadFactor: 3, errorMargin: 80, speed: 5 },
    normal: { leadFactor: 6, errorMargin: 45, speed: 8 },
    hard: { leadFactor: 10, errorMargin: 15, speed: 12 },
    impossible: { leadFactor: 1, errorMargin: 0, speed: 30 }
};

const savedDifficulty = localStorage.getItem('aiDifficulty');
if (savedDifficulty && difficultySettings[savedDifficulty]) {
    aiDifficulty = savedDifficulty;
}

loadSettings();

const blip = new Audio('blip.wav');

const keyStates = {
    up: false,
    down: false,
    left: false,
    right: false,
    p2Up: false,
    p2Down: false,
    p2Left: false,
    p2Right: false
};


const player = {
    x: canvas.width / 4 - 15/2,
    y: canvas.height / 2 - 15,
    width: 15,
    height: 50,
    moveSpeed: 25
};

const ai = {
    x: canvas.width / 4 * 2 + 15/2,
    y: canvas.height / 2 - 15,
    width: 15,
    height: 50,
    speed: 25
};

const initialBallSpeed = 15;
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speed: 21,
    dx: 15,
    dy: 9,
    active: true,
    trail: [],
    flashColor: null,
    flashAlpha: 0
};

function setDifficulty(level) {
    if (difficultySettings[level]) {
        aiDifficulty = level;
        localStorage.setItem('aiDifficulty', level);
    }
}

function playSound() {
    if (!muted) {
        new Audio('blip.wav').play();
        pulseTimer = 10; // frames to pulse
    }
}

function loadSettings() {
    const saved = localStorage.getItem('pongSettings');
    if (saved) {
        settings = JSON.parse(saved);
    }else{
        settings = {
            muted: false,
            aiDifficulty: 'normal',
            twoPlayerMode: false,
            sensitivity: 50,
            winningScore: 10
        };
    }

    winningScore = settings.winningScore;
    document.getElementById('winConSlider').value = winningScore
    var scoreIsOne = winningScore == 1
    document.getElementById('winConValue').innerText = scoreIsOne ? winningScore+' score' : winningScore+' scores'

    sensitivity = settings.sensitivity;
    document.getElementById('sensSlider').value = sensitivity
    document.getElementById('sensValue').innerText = sensitivity+"%"

    muted = settings.muted;
    document.getElementById('muteToggle').checked = muted;

    aiDifficulty = settings.aiDifficulty;
    document.getElementById('aiSelect').value = aiDifficulty;

    twoPlayerMode = settings.twoPlayerMode;
    document.getElementById('twoPlayerToggle').checked = twoPlayerMode;

}


function draw() {
    ctx.fillStyle = "#000";  // Dark background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw center line
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = "#444";
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Scores
    ctx.font = '48px Arial';
    ctx.fillStyle = "white";
    ctx.shadowColor = "white";
    ctx.shadowBlur = 10;
    ctx.fillText(score, canvas.width / 2 - 100, 50);
    ctx.fillText(aiscore, canvas.width / 2 + 100, 50);
    ctx.font = '35px Arial';
    ctx.fillStyle = `rgba(255,255,255,0.4)`;
    ctx.shadowColor = "white";
    if (streak >= 5) ctx.fillStyle = `rgba(255,${255 - streak * 15 + 5},${255 - streak * 15 + 5},${0.4 + streak / 20})`
    if (streak >= 5) ctx.shadowColor = `rgba(255,${255 - streak * 15 + 5},${255 - streak * 15 + 5},${0.4 + streak / 20})`
    ctx.shadowBlur = 10;
    ctx.fillText(streak, (canvas.width / 2) - ((streak.toString().length / 4) * 35), 40);
    ctx.shadowBlur = 0;

    if (pulseTimer > 0) {
        const pulseRadius = ball.radius + (10 - pulseTimer) * 3;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 255, ${pulseTimer / 20})`;
        ctx.shadowColor = "cyan";
        ctx.shadowBlur = 30;
        ctx.fill();
        ctx.shadowBlur = 0;
        pulseTimer--;
    }

    // === Goal Creases (Semi-circles) ===
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;

    // Left goal crease
    ctx.beginPath();
    ctx.arc(0, canvas.height / 2, 150, -Math.PI / 2, Math.PI / 2, false);
    ctx.stroke();

    // Right goal crease
    ctx.beginPath();
    ctx.arc(canvas.width, canvas.height / 2, 150, Math.PI / 2, -Math.PI / 2, false);
    ctx.stroke();

    // Faceoff Dots Left and Right
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(canvas.width * 0.25, canvas.height / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(canvas.width * 0.75, canvas.height / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Center circle
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 150, 0, Math.PI * 2);
    ctx.stroke();

    // Optional: faceoff dot
    ctx.fillStyle = "#888";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // === Border Lines ===
    ctx.lineWidth = 4;
    ctx.setLineDash([0, 0]);

    ctx.strokeStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(canvas.width, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.stroke();

    ctx.strokeStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, canvas.height/2 - 150);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(0, canvas.height/2 + 150);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width, 0);
    ctx.lineTo(canvas.width, canvas.height/2 - 150);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width, canvas.height);
    ctx.lineTo(canvas.width, canvas.height/2 + 150);
    ctx.stroke();

    // Ball trail
    for (let i = 0; i < ball.trail.length; i++) {
        const t = ball.trail[i];
        ctx.beginPath();
        ctx.arc(t.x, t.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 255, 255, ${t.alpha})`;
        ctx.fill();
        t.alpha *= 0.9;
    }

    // Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.shadowColor = ball.flashColor ? `rgba(${ball.flashColor}, 1)` : "cyan";
    ctx.shadowBlur = 20;
    ctx.fillStyle = ball.flashColor ? `rgba(${ball.flashColor}, ${ball.flashAlpha})` : "cyan";
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = twoPlayerMode ? '0px Arial' : '20px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`AI: ${aiDifficulty}`, canvas.width - 120, canvas.height - 20);


    // Player paddle
    ctx.shadowColor = "magenta";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "magenta";
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // AI / Player 2 paddle
    ctx.shadowColor = twoPlayerMode ? "lime" : "red";
    ctx.fillStyle = ctx.shadowColor;
    ctx.fillRect(ai.x, ai.y, ai.width, ai.height);
    ctx.shadowBlur = 0;

    // Game messages
    if (paused && !gameOver) {
        ctx.font = '64px Arial';
        ctx.fillStyle = "white";
        ctx.shadowColor = "white";
        ctx.shadowBlur = 10;
        ctx.fillText("Paused", canvas.width / 2 - 100, canvas.height / 2);
        ctx.shadowBlur = 0;
    }

    if (gameOver) {
        ctx.font = '64px Arial';
        const msg = score >= winningScore ? "You Win" : "Opponent Wins";
        ctx.fillText(msg, (canvas.width / 2) - ((msg.length / 4) * 64), canvas.height / 2 - 30);
        ctx.font = '32px Arial';
        ctx.fillText("Press anywhere to restart", canvas.width / 2 - 180, canvas.height / 2 + 40);
    }
}

function resetBall() {
    streak = 0;
    ball.speed = initialBallSpeed;
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ai.x = canvas.width/4 * 3 - 7.5
    ai.y = canvas.height/2 - 25
    player.x = canvas.width/4 - 7.5
    player.y = canvas.height/2 - 25
    ball.active = false;
    setTimeout(() => {
        if (!gameOver) {
            randomizeDirection();
            ball.active = true;
        }
    }, 2000);
}

function randomizeDirection() {
    const angle = Math.random() * Math.PI / 3 - Math.PI / 6;
    const directionX = Math.random() < 0.5 ? -1 : 1;
    ball.dx = directionX * ball.speed * Math.cos(angle);
    ball.dy = ball.speed * Math.sin(angle);
}

function togglePause() {
    if (!gameOver) {
        paused = !paused;
        draw();
    }
}

function checkGameOver() {
    if (score >= winningScore || aiscore >= winningScore) {
        gameOver = true;
        paused = true;
        draw();
    }
}

function restartGame() {
    score = 0;
    aiscore = 0;
    paused = false;
    gameOver = false;
    ball.speed = 30;
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ai.x = canvas.width/4 * 3 - 7.5
    ai.y = canvas.height/2 - 25
    player.x = canvas.width/4 - 7.5
    player.y = canvas.height/2 - 25
    randomizeDirection();
    draw();
    resetBall();
}

function checkCollision(paddle) {
    return (
        ball.x + ball.radius >= paddle.x &&
        ball.x - ball.radius <= paddle.x + paddle.width &&
        ball.y + ball.radius >= paddle.y &&
        ball.y - ball.radius <= paddle.y + paddle.height
    );
}

function moveBall() {
    if (
        !isFinite(ball.x) || !isFinite(ball.y) ||
        !isFinite(ball.dx) || !isFinite(ball.dy) ||
        !isFinite(ball.speed)
    ) {
        alert('Invalid ball state detected, resetting...');
        resetBall();
        return;
    }

    if (paused || gameOver || !ball.active) return;

    const steps = Math.min(Math.ceil(ball.speed / 5), 20); // Break fast movement into smaller steps
    const dxStep = ball.dx / steps;
    const dyStep = ball.dy / steps;

    for (let i = 0; i < steps; i++) {
        ball.x += dxStep;
        ball.y += dyStep;

        // Top/bottom bounce
        if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
            ball.dy *= -1;
            ball.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ball.y));
            break;
        }

        if(ball.x - ball.radius <= 0){
            if(ball.y + ball.radius >= canvas.height/2 + 150 || ball.y - ball.radius <= canvas.height/2 - 150){
                const baseSpeed = Math.min(initialBallSpeed + streak * 1.2, 80);
                ball.speed = baseSpeed;
                ball.dx = baseSpeed;
                ball.dy += (Math.random() - 0.5) * 2;
                ball.x = 0 + ball.radius + 1;
                ball.flashAlpha = 1;
                break; // ✅ Exit loop after collision
            }
        }
        if(ball.x + ball.radius >= canvas.width){
            if(ball.y + ball.radius >= canvas.height/2 + 150 || ball.y - ball.radius <= canvas.height/2 - 150){
                const baseSpeed = Math.min(initialBallSpeed + streak * 1.2, 80);
                ball.speed = baseSpeed;
                ball.dx = -baseSpeed;
                ball.dy += (Math.random() - 0.5) * 2;
                ball.x = canvas.width - ball.radius - 1;
                ball.flashAlpha = 1;
                break; // ✅ Exit loop after collision
            }
        }

        // === Player 1 Collision ===
        if (
            ball.x - ball.radius < player.x + player.width &&
            ball.x + ball.radius > player.x &&
            ball.y + ball.radius > player.y &&
            ball.y - ball.radius < player.y + player.height
        ) {
            playSound();
            streak++;
            const baseSpeed = Math.min(initialBallSpeed + streak * 1.1, 80);
            ball.speed = baseSpeed;
            ball.dx = baseSpeed;
            ball.dy += (Math.random() - 0.5) * 2;
            ball.x = player.x + player.width + ball.radius + 1; // Knock it out
            ball.flashAlpha = 1;
            break; // ✅ Exit loop after collision
        }

        // === Player 2 Collision ===
        if (
            ball.x + ball.radius > ai.x &&
            ball.x - ball.radius < ai.x + ai.width &&
            ball.y + ball.radius > ai.y &&
            ball.y - ball.radius < ai.y + ai.height
        ) {
            playSound();
            if (twoPlayerMode) streak++
            const baseSpeed = Math.min(initialBallSpeed + streak * 1.2, 80);
            ball.speed = baseSpeed;
            ball.dx = -baseSpeed;
            ball.dy += (Math.random() - 0.5) * 2;
            ball.x = ai.x - ball.radius - 1;
            ball.flashAlpha = 1;
            break; // ✅ Exit loop after collision
        }

        // === Scoring ===
        if (ball.x - ball.radius < 0) {
            aiscore++;
            streak = 0;
            checkGameOver();
            resetBall();
            return;
        }
        if (ball.x + ball.radius > canvas.width) {
            score++;
            streak = 0;
            checkGameOver();
            resetBall();
            return;
        }
    }

    // Trail effect
    ball.trail.push({ x: ball.x, y: ball.y, alpha: 1 });
    if (ball.trail.length > 40) ball.trail.shift();
}





function move() {
    if (paused || gameOver) return;

    if (keyStates.up && player.y > 0) {
        player.y -= player.moveSpeed;
    }
    if (keyStates.down && player.y < canvas.height - player.height) {
        player.y += player.moveSpeed;
    }
    if (keyStates.left && player.x > 0) {
        player.x -= player.moveSpeed;
    }
    if (keyStates.right && player.x < canvas.width / 2 - player.width) {
        player.x += player.moveSpeed;
    }
    player.moveX = 0;

    if (keyStates.left) {
        player.x = Math.max(0, player.x - player.moveSpeed);
        player.moveX = -player.moveSpeed;
    }
    if (keyStates.right) {
        player.x = Math.min(canvas.width / 2 - player.width - 5, player.x + player.moveSpeed);
        player.moveX = player.moveSpeed;
    }

}


function movePlayer2() {
    if (paused || gameOver || !twoPlayerMode) return;

    if (keyStates.p2Up && ai.y > 0) {
        ai.y -= ai.speed;
    }
    if (keyStates.p2Down && ai.y < canvas.height - ai.height) {
        ai.y += ai.speed;
    }
    if (keyStates.p2Left && ai.x > canvas.width / 2) {
        ai.x -= ai.speed;
    }
    if (keyStates.p2Right && ai.x < canvas.width - ai.width) {
        ai.x += ai.speed;
    }
    ai.moveX = 0;

    if (keyStates.left) {
        ai.x = Math.max(0, ai.x - ai.moveSpeed);
        ai.moveX = -ai.moveSpeed;
    }
    if (keyStates.right) {
        ai.x = Math.min(canvas.width / 2 - ai.width - 5, ai.x + ai.moveSpeed);
        ai.moveX = ai.moveSpeed;
    }
}


function moveAI() {
    if (paused || gameOver || twoPlayerMode) return;

    const { errorMargin, leadFactor, speed } = difficultySettings[aiDifficulty]
    ai.speed = speed

    const center = ai.y + ai.height / 2;
    const centerX = ai.x + ai.width / 2;
    const prediction = ball.y + ball.dy * leadFactor;  // predict x frames ahead
    const xprediction = ball.x + ball.dx * leadFactor; // predict x frames ahead

    const targetY = prediction;
    const targetX = xprediction;
    const diff = targetY - center;
    const diffX = targetX - centerX;


    if (Math.abs(diff) > errorMargin) {
        ai.y += Math.sign(diff) * ai.speed;
    }

    if (Math.abs(diffX) > errorMargin) {
        ai.x += Math.sign(diffX) * ai.speed;
    }

    ai.y = Math.max(0, Math.min(canvas.height - ai.height, ai.y));
    const maxX = canvas.width - ai.width; // or canvas.width / 2 if limiting to one side
    const minX = canvas.width / 2 + 5;        // center of the screen

    ai.x = Math.max(minX, Math.min(maxX, ai.x));
}


document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'escape') return togglePause();
    if(gameOver) return restartGame();
    if ((key === 'p' || key === 'enter') && paused && !gameOver) return paused = false;
    if (key === 'r') return restartGame();
    if (key === 'm') muted = !muted;
    if (key === 't') twoPlayerMode = !twoPlayerMode;

    if (paused || gameOver) return;
    if (key === 'arrowup' || key === 'w') keyStates.up = true;
    if (key === 'arrowdown' || key === 's') keyStates.down = true;
    if (key === 'arrowleft' || key === 'a') keyStates.left = true;
    if (key === 'arrowright' || key === 'd') keyStates.right = true;

    if (key === 'i') keyStates.p2Up = true;
    if (key === 'k') keyStates.p2Down = true;
    if (key === 'j') keyStates.p2Left = true;
    if (key === 'l') keyStates.p2Right = true;

    if (key === '1') aiDifficulty = 'easy';
    if (key === '2') aiDifficulty = 'normal';
    if (key === '3') aiDifficulty = 'hard';
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') keyStates.up = false;
    if (key === 'arrowdown' || key === 's') keyStates.down = false;
    if (key === 'arrowleft' || key === 'a') keyStates.left = false;
    if (key === 'arrowright' || key === 'd') keyStates.right = false;

    if (key === 'i') keyStates.p2Up = false;
    if (key === 'k') keyStates.p2Down = false;
    if (key === 'j') keyStates.p2Left = false;
    if (key === 'l') keyStates.p2Right = false;

});

let lastTouches = {}; // Store last positions for each paddle
let paddleTouches = {}; // Track which touch controls which paddle

let prevX = 0;
let prevY = 0;

canvas.addEventListener('click', () => {
    if(gameOver) return restartGame();
    canvas.requestPointerLock(); // Request pointer lock when the user clicks the canvas
});

document.addEventListener('mousemove', e => {
    if (document.pointerLockElement === canvas) {
        // Use raw movement deltas from Pointer Lock
        player.x += e.movementX * (sensitivity / 100);
        player.y += e.movementY * (sensitivity / 100);

        // Clamp the player within canvas boundaries
        player.x = Math.max(0, Math.min(player.x, canvas.width / 2 - player.width - ball.radius));
        player.y = Math.max(0, Math.min(player.y, canvas.height - player.height));

        draw(); // Redraw player
    }
})

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if(gameOver) return restartGame();
    for (let touch of e.changedTouches) {
        const x = touch.clientX;
        const y = touch.clientY;

        // Left half: Player 1
        if (x < canvas.width / 2 && paddleTouches.player1 == null) {
            paddleTouches.player1 = touch.identifier;
            lastTouches.player1 = { x, y };
        }

        // Right half: Player 2
        else if (x >= canvas.width / 2 && paddleTouches.player2 == null) {
            paddleTouches.player2 = touch.identifier;
            lastTouches.player2 = { x, y };
        }
    }
});

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    for (let touch of e.touches) {
        const id = touch.identifier;
        const x = touch.clientX;
        const y = touch.clientY;

        // === Player 1 ===
        if (id === paddleTouches.player1 && lastTouches.player1) {
            const deltaX = x - lastTouches.player1.x;
            const deltaY = y - lastTouches.player1.y;
            player.x = Math.max(0, Math.min(canvas.width / 2 - player.width - 5, player.x + deltaX));
            player.y = Math.max(0, Math.min(canvas.height - player.height, player.y + deltaY));
            lastTouches.player1 = { x, y };
        }

        // === Player 2 ===
        if (id === paddleTouches.player2 && lastTouches.player2) {
            const deltaX = x - lastTouches.player2.x;
            const deltaY = y - lastTouches.player2.y;
            ai.x = Math.max(canvas.width / 2 + 5, Math.min(canvas.width - ai.width, ai.x + deltaX));
            ai.y = Math.max(0, Math.min(canvas.height - ai.height, ai.y + deltaY));
            lastTouches.player2 = { x, y };
        }
    }
    draw(); // Re-render the frame
});

canvas.addEventListener('touchend', e => {
    e.preventDefault();
    for (let touch of e.changedTouches) {
        const id = touch.identifier;
        if (id === paddleTouches.player1) {
            paddleTouches.player1 = null;
            lastTouches.player1 = null;
        }
        if (id === paddleTouches.player2) {
            paddleTouches.player2 = null;
            lastTouches.player2 = null;
        }
    }
});

// SETTINGS MENU HOOKUP
const settingsMenu = document.getElementById('settingsMenu');
const openBtn = document.getElementById('openSettingsBtn');
const aiSelect = document.getElementById('aiSelect');
const twoPlayerToggle = document.getElementById('twoPlayerToggle');
const muteToggle = document.getElementById('muteToggle');
const sensSlider = document.getElementById('sensSlider');
const sensValue = document.getElementById('sensValue');
const winConSlider = document.getElementById('winConSlider');
const winConValue = document.getElementById('winConValue');

var settingsOpened = false

openBtn.addEventListener('click', () => {
    settingsOpened = !settingsOpened
    if(!settingsOpened) {
        settingsMenu.classList.remove('show');
        paused = false;
        saveSettings();
        return
    }
    settingsMenu.style.display = 'block';
    settingsMenu.classList.add('show');
    paused = true;
    draw(); // redraw with "Paused"
    saveSettings();
});

function closeSettings() {
    settingsMenu.classList.remove('show');
    paused = false;
    saveSettings();
}


aiSelect.addEventListener('change', () => {
    setDifficulty(aiSelect.value);
    settings.aiDifficulty = aiSelect.value
    saveSettings();
});

winConSlider.addEventListener('input', () => {
    winningScore = winConSlider.value
    var scoreIsOne = winningScore == 1
    winConValue.innerText = scoreIsOne ? winningScore+' score' : winningScore+' scores'
    settings.winningScore = winConSlider.value
    saveSettings();
});

sensSlider.addEventListener('input', () => {
    sensitivity = sensSlider.value
    sensValue.innerText = sensitivity+'%'
    settings.sensitivity = sensSlider.value
    saveSettings();
});

twoPlayerToggle.addEventListener('change', () => {
    twoPlayerMode = twoPlayerToggle.checked;
    settings.twoPlayerMode = twoPlayerMode
    saveSettings();
});

muteToggle.addEventListener('change', () => {
    muted = muteToggle.checked;
    settings.muted = muted
    saveSettings();
});

// Load saved settings on page load
window.addEventListener('load', () => {
    const saved = localStorage.getItem('aiDifficulty');
    if (saved && difficultySettings[saved]) {
        aiSelect.value = saved;
        aiDifficulty = saved;
    }
});

function gameLoop() {
    move();
    movePlayer2();
    moveBall();
    moveAI();
    draw();
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);