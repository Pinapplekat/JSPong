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

const winningScore = 10;
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
    x: 15,
    y: 0,
    width: 15,
    height: 200,
    moveSpeed: 25
};

const ai = {
    x: canvas.width - 30,
    y: 0,
    width: 15,
    height: 200,
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

function playSound() {
    if (!muted) {
        new Audio('blip.wav').play();
        pulseTimer = 10; // frames to pulse
    }
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
        const msg = score >= winningScore ? "You Win!" : "Opponent Wins!";
        ctx.fillText("Game Over", canvas.width / 2 - 150, canvas.height / 2 - 50);
        ctx.fillText(msg, canvas.width / 2 - 130, canvas.height / 2 + 50);
        ctx.font = '32px Arial';
        ctx.fillText("Press R to restart", canvas.width / 2 - 120, canvas.height / 2 + 100);
    }
}

function resetBall() {
    streak = 0;
    ball.speed = initialBallSpeed;
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
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

        // === Player 1 Collision ===
        if (
            ball.x - ball.radius < player.x + player.width &&
            ball.x + ball.radius > player.x &&
            ball.y + ball.radius > player.y &&
            ball.y - ball.radius < player.y + player.height
        ) {
            playSound();
            streak++;
            const baseSpeed = Math.min(initialBallSpeed + streak * 1.2, 80);
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
        player.x = Math.min(canvas.width / 2 - player.width, player.x + player.moveSpeed);
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
        ai.x = Math.min(canvas.width / 2 - ai.width, ai.x + ai.moveSpeed);
        ai.moveX = ai.moveSpeed;
    }
}


function moveAI() {
    if (paused || gameOver || twoPlayerMode) return;

    const center = ai.y + ai.height / 2;
    const prediction = ball.y + ball.dy * 10; // predict 10 frames ahead

    const targetY = prediction;
    const errorMargin = 20; // more = worse AI
    const diff = targetY - center;

    if (Math.abs(diff) > errorMargin) {
        ai.y += Math.sign(diff) * ai.speed;
    }

    ai.y = Math.max(0, Math.min(canvas.height - ai.height, ai.y));
}


document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'escape') return togglePause();
    if ((key === 'p' || key === 'enter') && paused && !gameOver) return paused = false;
    if (key === 'r' && gameOver) return restartGame();
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

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
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
            player.x = Math.max(0, Math.min(canvas.width / 2 - player.width, player.x + deltaX));
            player.y = Math.max(0, Math.min(canvas.height - player.height, player.y + deltaY));
            lastTouches.player1 = { x, y };
        }

        // === Player 2 ===
        if (id === paddleTouches.player2 && lastTouches.player2) {
            const deltaX = x - lastTouches.player2.x;
            const deltaY = y - lastTouches.player2.y;
            ai.x = Math.max(canvas.width / 2, Math.min(canvas.width - ai.width, ai.x + deltaX));
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


function gameLoop() {
    move();
    movePlayer2();
    moveBall();
    moveAI();
    draw();
    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);