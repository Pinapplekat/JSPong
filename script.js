const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0;
let aiscore = 0;
let streak = 0;
let paused = false;
let gameOver = false;
let pulseTimer = 0;

let settings = {
    muted: false,
    aiDifficulty: 'normal',
    twoPlayerMode: false,
    sensitivity: 0.5,
    winningScore: 10,
    paddleSize: 'normal'
};

let { muted, twoPlayerMode, sensitivity, winningScore, paddleSize } = settings;

function saveSettings() {
    localStorage.setItem('pongSettings', JSON.stringify(settings));
}

const difficultySettings = {
    easy: { leadFactor: 3, errorMargin: 80, speed: 5 },
    normal: { leadFactor: 6, errorMargin: 45, speed: 8 },
    hard: { leadFactor: 6, errorMargin: 15, speed: 12 },
    impossible: { leadFactor: 2, errorMargin: 1, speed: 25 }
};

const paddleSizes = {
    small: 40,
    medium: 60,
    large: 85,
    larger: 100
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
    id: '1',
    x: canvas.width / 4 - 15 / 2,
    y: canvas.height / 2 - 15,
    width: 15,
    height: paddleSizes[paddleSize],
    moveSpeed: 15,
    velocity: {
        x: 0,
        y: 0
    },
    lastPos: {
        x: canvas.width / 4 - 15 / 2,
        y: canvas.height / 2 - 15
    }
};

const ai = {
    id: '2',
    x: canvas.width / 4 * 2 + 15 / 2,
    y: canvas.height / 2 - 15,
    width: 15,
    height: paddleSizes[paddleSize],
    speed: 25,
    velocity: {
        x: 0,
        y: 0
    },
    lastPos: {
        x: canvas.width / 4 * 2 + 15 / 2,
        y: canvas.height / 2 - 15
    }
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
    flashAlpha: 0,
    lastHit: null,
    velocity: {
        x: (Math.random() - 0.5) * 200,
        y: (Math.random() - 0.5) * 200
    },
    lastPos: {
        x: canvas.width / 2,
        y: canvas.height / 2 
    }
};

function setDifficulty(level) {
    if (difficultySettings[level]) {
        aiDifficulty = level;
        localStorage.setItem('aiDifficulty', level);
    }
}

function setPaddleSize(size) {
    if (paddleSizes[size]) {
        paddleSize = size;
        player.height = paddleSizes[paddleSize]
        ai.height = paddleSizes[paddleSize]
    } else {
        paddleSize = 'medium'
        player.height = paddleSizes[paddleSize]
        ai.height = paddleSizes[paddleSize]
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
    } else {
        settings = {
            muted: false,
            aiDifficulty: 'normal',
            twoPlayerMode: false,
            sensitivity: 50,
            winningScore: 10,
            paddleSize: 'medium'
        };
    }

    winningScore = settings.winningScore;
    document.getElementById('winConSlider').value = winningScore
    var scoreIsOne = winningScore == 1
    document.getElementById('winConValue').innerText = scoreIsOne ? winningScore + ' score' : winningScore + ' scores'

    sensitivity = settings.sensitivity;
    document.getElementById('sensSlider').value = sensitivity
    document.getElementById('sensValue').innerText = sensitivity + "%"

    muted = settings.muted;
    document.getElementById('muteToggle').checked = muted;

    aiDifficulty = settings.aiDifficulty;
    document.getElementById('aiSelect').value = aiDifficulty;

    paddleSize = settings.paddleSize;
    // setPaddleSize(paddleSize)
    document.getElementById('paddleSizeSelect').value = paddleSize;

    twoPlayerMode = settings.twoPlayerMode;
    document.getElementById('twoPlayerToggle').checked = twoPlayerMode;

}


var prevS = Date.now() / 1000
var frames = 0
var frameRate = 0

var t1 = Date.now()

function draw() {
    var currS = Date.now() / 1000
    if (currS - prevS >= 1) {
        frameRate = frames
        frames = 0
        prevS = currS
    }
    frames++
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
    ctx.lineTo(0, canvas.height / 2 - 150);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(0, canvas.height / 2 + 150);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width, 0);
    ctx.lineTo(canvas.width, canvas.height / 2 - 150);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(canvas.width, canvas.height);
    ctx.lineTo(canvas.width, canvas.height / 2 + 150);
    ctx.stroke();

    ctx.strokeStyle = '#ff0000';
    ctx.fillStyle = '#ff0000'
    ctx.beginPath();
    ctx.moveTo(player.lastPos.x, player.lastPos.y);
    ctx.lineTo(player.x+player.width, player.y);
    ctx.lineTo(player.x+player.width, player.y+player.height);
    ctx.lineTo(player.lastPos.x, player.lastPos.y+player.height);
    ctx.stroke();
    ctx.fill()

    ctx.beginPath();
    ctx.moveTo(ai.lastPos.x, ai.lastPos.y);
    ctx.lineTo(ai.x+ai.width, ai.y);
    ctx.lineTo(ai.x+ai.width, ai.y+ai.height);
    ctx.lineTo(ai.lastPos.x, ai.lastPos.y+ai.height);
    ctx.stroke();
    ctx.fill()

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


    ctx.shadowColor = "rgb(50,50,50)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgb(50,50,50)";
    ctx.fillRect(player.lastPos.x, player.lastPos.y, player.width, player.height);

    // Player paddle
    ctx.shadowColor = "magenta";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "magenta";
    ctx.fillRect(player.x, player.y, player.width, player.height);


    ctx.font = '20px Arial';
    ctx.fillStyle = `rgba(255,255,255,0.4)`;
    ctx.fillText("FPS: " + (frameRate), ((canvas.width) - 100), 30);
    ctx.fillText("P1 Velocity x: " + (player.velocity.x), ((canvas.width) - 170), 60);
    ctx.fillText("P1 Velocity y: " + (player.velocity.y), ((canvas.width) - 170), 90);

    ctx.fillText("P2 Velocity x: " + (ai.velocity.x), ((canvas.width) - 170), 120);
    ctx.fillText("P2 Velocity y: " + (ai.velocity.y), ((canvas.width) - 170), 150);

    ctx.fillText("Ball Pos: " + (ball.x) + ", " + (ball.y), ((canvas.width) - 200), 180);


    ctx.shadowColor = 'rgb(50,50,50)';
    ctx.fillStyle = ctx.shadowColor;
    ctx.fillRect(ai.lastPos.x, ai.lastPos.y, ai.width, ai.height);
    ctx.shadowBlur = 0;
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
    ball.velocity.x = (Math.random() - 0.5) * 200
    ball.velocity.y = (Math.random() - 0.5) * 200
    ball.speed = initialBallSpeed;
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ai.x = canvas.width / 4 * 3 - 7.5
    ai.y = canvas.height / 2 - 25
    player.x = canvas.width / 4 - 7.5
    player.y = canvas.height / 2 - 25
    ball.active = false;
    setTimeout(() => {
        if (!gameOver) {
            randomizeDirection();
            ball.active = true;
        }
    }, 2000);
}
function randomizeDirection() {
    const angle = Math.random() * Math.PI / 3 - Math.PI / 12;
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
    ai.x = canvas.width / 4 * 3 - 7.5
    ai.y = canvas.height / 2 - 25
    player.x = canvas.width / 4 - 7.5
    player.y = canvas.height / 2 - 25
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

function checkEdgeCollision(paddle) {
    const epsilon = 0.1; // tolerance for floating-point comparison

    const ballLeft = ball.x - ball.radius;
    const ballRight = ball.x + ball.radius;
    const ballTop = ball.y - ball.radius;
    const ballBottom = ball.y + ball.radius;

    const paddleLeft = paddle.x;
    const paddleRight = paddle.x + paddle.width;
    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + paddle.height;

    const horizontalTouch = (
        ballBottom > paddleTop &&
        ballTop < paddleBottom &&
        (
            Math.abs(ballRight - paddleLeft) < epsilon ||
            Math.abs(ballLeft - paddleRight) < epsilon
        )
    );

    const verticalTouch = (
        ballRight > paddleLeft &&
        ballLeft < paddleRight &&
        (
            Math.abs(ballBottom - paddleTop) < epsilon ||
            Math.abs(ballTop - paddleBottom) < epsilon
        )
    );

    return horizontalTouch || verticalTouch;
}

function onPlayerHitsBall(player, ball) {
    // Hit position based on player paddle height
    const hitPos = (ball.y - (player.y + player.height / 2)) / (player.height / 2);
    const angle = Math.PI / 4 * hitPos;  // Defines the bounce angle

    // Speed control
    const baseSpeed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
    const maxSpeed = 600;  // Maximum speed
    const minSpeed = 1;  // Minimum speed

    // Set the ball speed between min and max limits
    let speed = Math.min(Math.max(baseSpeed*3, minSpeed), maxSpeed);
    
    // Remove or significantly scale down player's velocity effect on the ball
    const playerSpeedImpact = Math.abs(player.velocity.x) *0.1;  // Reduced factor for player velocity
    speed += playerSpeedImpact;

    // Store the ball's previous position for collision checking
    const prevBallX = ball.x;
    const prevBallY = ball.y;

    // Adjust ball position based on velocity (without impacting speed too much)
    ball.x += ball.velocity.x / frameRate;
    ball.y += ball.velocity.y / frameRate;

    // Determine which side the ball hit the player paddle
    const side = getCollisionSide(ball, player);

    // Handle collisions for each side
    if (side === 'left') {
        ball.x = player.x - ball.radius - 1;
        ball.velocity.x = -Math.abs(speed * Math.cos(angle));  // Reflect horizontally
        ball.velocity.y = speed * Math.sin(angle);  // Reflect vertically
    } else if (side === 'right') {
        ball.x = player.x + player.width + ball.radius + 1;
        ball.velocity.x = Math.abs(speed * Math.cos(angle));  // Reflect horizontally
        ball.velocity.y = speed * Math.sin(angle);  // Reflect vertically
    } else if (side === 'top') {
        ball.y = player.y - ball.radius - 1;
        ball.velocity.y = -Math.abs(speed * Math.sin(angle));  // Reflect vertically
        ball.velocity.x = speed * Math.cos(angle);  // Keep horizontal velocity
    } else if (side === 'bottom') {
        ball.y = player.y + player.height + ball.radius + 1;
        ball.velocity.y = Math.abs(speed * Math.sin(angle));  // Reflect vertically
        ball.velocity.x = speed * Math.cos(angle);  // Keep horizontal velocity
    }

    // Check if the ball actually passed through the paddle and adjust accordingly
    if (side && (prevBallX !== ball.x || prevBallY !== ball.y)) {
        // Adjust ball position to prevent it from passing through the paddle
        if (side === 'left') {
            ball.x = player.x - ball.radius - 1;
        } else if (side === 'right') {
            ball.x = player.x + player.width + ball.radius + 1;
        } else if (side === 'top') {
            ball.y = player.y - ball.radius - 1;
        } else if (side === 'bottom') {
            ball.y = player.y + player.height + ball.radius + 1;
        }
    }

    // Update ball velocity with frame rate correction
    ball.dx = ball.velocity.x / frameRate;
    ball.dy = ball.velocity.y / frameRate;
}

function getCollisionSide(ball, paddle) {
    const ballCenterX = ball.x;
    const ballCenterY = ball.y;
    const paddleCenterX = paddle.x + paddle.width / 2;
    const paddleCenterY = paddle.y + paddle.height / 2;

    const dx = ballCenterX - paddleCenterX;
    const dy = ballCenterY - paddleCenterY;

    const halfWidth = paddle.width / 2;
    const halfHeight = paddle.height / 2;

    const overlapX = halfWidth + ball.radius - Math.abs(dx);
    const overlapY = halfHeight + ball.radius - Math.abs(dy);

    if (overlapX > 0 && overlapY > 0) {
        if (overlapX < overlapY) {
            return dx < 0 ? 'left' : 'right';
        } else {
            return dy < 0 ? 'top' : 'bottom';
        }
    }

    return null; // No collision
}

function normalizeBallVelocity() {
    const currentSpeed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
    const maxSpeed = Math.min(initialBallSpeed + streak * 1.2, 80);
    if (currentSpeed > maxSpeed) {
        const scale = maxSpeed / currentSpeed;
        ball.velocity.x *= scale;
        ball.velocity.y *= scale;
    }
}

function moveBall(deltaTime) {
    const collided = isBallCollidingWithPaddle(player, ball.lastPos.x, ball.lastPos.y, ball.x, ball.y, ball);

    if (collided) {
        alert("Collision detected!");
    } else {
        // alert("No collision.");
    }
    // Ensure deltaTime is reasonable (avoid large jumps in movement)
    deltaTime = Math.min(deltaTime, 0.1); // Cap deltaTime to 100ms to prevent super fast movement

    if (paused || gameOver || !ball.active) return;

    // Calculate the speed (based on velocity)
    const currentSpeed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);

    // Define the maximum number of steps (capped to 20 for smoothness)
    const maxSteps = 20;

    // Break fast movement into smaller steps
    const steps = Math.min(Math.ceil(currentSpeed * deltaTime / 5), maxSteps);

    const dxStep = (ball.velocity.x * deltaTime) / steps;
    const dyStep = (ball.velocity.y * deltaTime) / steps;

    // Apply drag to slow down the ball naturally (friction in the air)
    const dragFactor = 0.9999;  // Slightly stronger drag for more realistic slow down

    // Move the ball by smaller steps and check for sweep collisions
    for (let i = 0; i < steps; i++) {
        // Save the previous ball position for sweep check
        const prevBallX = ball.x;
        const prevBallY = ball.y;

        // Move the ball by its current velocity step
        ball.x += dxStep;
        ball.y += dyStep;

        // === Check for collisions with paddles using sweep check ===

        // Player 1 Paddle Collision Sweep Check
        if (isBallCollidingWithPaddle(player, ball.lastPos.x, ball.lastPos.y, ball.x, ball.y)) {
            playSound();
            streak++;
            normalizeBallVelocity();
            ball.flashAlpha = 1;
            ball.lastHit = 'player1';
            onPlayerHitsBall(player, ball);
            break;
        }

        // Player 2 Paddle Collision Sweep Check
        if (isBallCollidingWithPaddle(ai, prevBallX, prevBallY, ball.x, ball.y)) {
            playSound();
            if (twoPlayerMode) streak++;
            normalizeBallVelocity();
            ball.flashAlpha = 1;
            ball.lastHit = 'player2';
            onPlayerHitsBall(ai, ball);
            break;
        }

        // === Handle ball bouncing off top/bottom ===
        if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
            ball.velocity.y *= -1;  // Reverse the vertical velocity
            ball.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ball.y));
            break;
        }

        // === Handle left/right wall collisions ===
        if (ball.x - ball.radius <= 0) {
            if (ball.y + ball.radius >= canvas.height / 2 + 150 || ball.y - ball.radius <= canvas.height / 2 - 150) {
                ball.velocity.x *= -1;
                ball.velocity.y += (Math.random() - 0.5) * 2;
                ball.x = ball.radius + 1;  // Reset ball position to avoid getting stuck
                ball.flashAlpha = 1;
                break;
            }
        }

        if (ball.x + ball.radius >= canvas.width) {
            if (ball.y + ball.radius >= canvas.height / 2 + 150 || ball.y - ball.radius <= canvas.height / 2 - 150) {
                ball.velocity.x *= -1;
                ball.velocity.y += (Math.random() - 0.5) * 2;
                ball.x = canvas.width - ball.radius - 1;
                ball.flashAlpha = 1;
                break;
            }
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

    // Apply drag to both x and y velocity components
    ball.velocity.x *= dragFactor;
    ball.velocity.y *= dragFactor;

    // Recalculate ball speed after applying drag
    ball.speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);

    // Add new trail point with full alpha (can adjust fading later)
    ball.trail.push({ x: ball.x, y: ball.y, alpha: 1 });

    // Limit trail length (optional)
    if (ball.trail.length > 40) ball.trail.shift();
}

// Function to check if the ball collides with a paddle (sweep check)
function isBallCollidingWithPaddle(paddle, prevBallX, prevBallY, ballX, ballY, ball) {
    const { x, y, width, height, lastPos } = paddle;

    // Define the swept area as a quadrilateral
    const sweptPolygon = [
        { x: lastPos.x, y: lastPos.y },             // A (lastPos top-left)
        { x: lastPos.x + width, y: lastPos.y },     // B (lastPos top-right)
        { x: x + width, y: y + height },            // D' (current bottom-right)
        { x: x, y: y + height }                     // C' (current bottom-left)
    ];

    return lineIntersectsPolygon(prevBallX, prevBallY, ballX, ballY, sweptPolygon);
}

function lineIntersectsPolygon(x1, y1, x2, y2, polygon) {
    // Iterate through each edge of the polygon
    for (let i = 0; i < polygon.length; i++) {
        const j = (i + 1) % polygon.length;  // Next vertex (wrap around)
        if (linesIntersect(x1, y1, x2, y2, polygon[i].x, polygon[i].y, polygon[j].x, polygon[j].y)) {
            return true;  // If intersection occurs, return true
        }
    }
    return false;  // No intersection
}

function linesIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return false; // Lines are parallel

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;  // True if intersection is within bounds of both line segments
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
    if (paused || gameOver || twoPlayerMode || !ball.active) return;
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
    const minX = canvas.width / 2 + ball.radius;        // center of the screen
    ai.x = Math.max(minX, Math.min(maxX, ai.x));
}
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'escape') return togglePause();
    if (gameOver) return restartGame();
    if ((key === 'p' || key === 'enter') && paused && !gameOver) return paused = false;
    if (key === 'r') return restartGame();
    if (key === 'm') muted = !muted;
    if (key === 't') twoPlayerMode = !twoPlayerMode;
    if (key === '1') aiDifficulty = 'easy';
    if (key === '2') aiDifficulty = 'normal';
    if (key === '3') aiDifficulty = 'hard';
    if (key === '4') aiDifficulty = 'impossible';
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
let prevX = 0;
let prevY = 0;
canvas.addEventListener('click', () => {
    if (gameOver) return restartGame();
    canvas.requestPointerLock(); // Request pointer lock when the user clicks the canvas
});
document.addEventListener('mousemove', e => {
    if (paused || gameOver) return;
    if (document.pointerLockElement === canvas) {
        // Use raw movement deltas from Pointer Lock
        player.x += e.movementX * (sensitivity / 100);
        player.y += e.movementY * (sensitivity / 100);
        player.x = Math.max(0, Math.min(player.x, canvas.width / 2 - player.width - ball.radius + 1));
        player.y = Math.max(0, Math.min(player.y, canvas.height - player.height));
        draw(); // Redraw player
    }
})
canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (gameOver) return restartGame();
    if (paused) return;
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
    if (paused || gameOver) return;
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
const settingsMenu = document.getElementById('settingsMenu');
const openBtn = document.getElementById('openSettingsBtn');
const aiSelect = document.getElementById('aiSelect');
const paddleSizeSelect = document.getElementById('paddleSizeSelect');
const twoPlayerToggle = document.getElementById('twoPlayerToggle');
const muteToggle = document.getElementById('muteToggle');
const sensSlider = document.getElementById('sensSlider');
const sensValue = document.getElementById('sensValue');
const winConSlider = document.getElementById('winConSlider');
const winConValue = document.getElementById('winConValue');
var settingsOpened = false
openBtn.addEventListener('click', () => {
    settingsOpened = !settingsOpened
    if (!settingsOpened) {
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
paddleSizeSelect.addEventListener('change', () => {
    setPaddleSize(paddleSizeSelect.value);
    settings.paddleSize = paddleSizeSelect.value
    saveSettings();
});
winConSlider.addEventListener('input', () => {
    winningScore = winConSlider.value
    var scoreIsOne = winningScore == 1
    winConValue.innerText = scoreIsOne ? winningScore + ' score' : winningScore + ' scores'
    settings.winningScore = winConSlider.value
    saveSettings();
});
sensSlider.addEventListener('input', () => {
    sensitivity = sensSlider.value
    sensValue.innerText = sensitivity + '%'
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
window.addEventListener('load', () => {
    const saved = localStorage.getItem('aiDifficulty');
    if (saved && difficultySettings[saved]) {
        aiSelect.value = saved;
        aiDifficulty = saved;
    }
});

function updatePlayerVelocity(dt, player) {
    const deltaPos = {
        x: player.x - player.lastPos.x,
        y: player.y - player.lastPos.y
    };

    // dt is in milliseconds, convert to seconds for "pixels per second"
    const seconds = dt / 1000;
    player.velocity = {
        x: deltaPos.x / seconds,
        y: deltaPos.y / seconds
    };

    player.lastPos = { x: player.x, y: player.y };
}

function updateBallPos(dt, ball) {
    ball.lastPos = { x: ball.x, y: ball.y };
}

let lastFrameTime = performance.now();

function gameLoop() {
    var currentTime = performance.now()
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    move();
    movePlayer2();
    moveBall(deltaTime);
    moveAI();
    draw();
    updatePlayerVelocity(deltaTime, player);
    updatePlayerVelocity(deltaTime, ai);
    updateBallPos(deltaTime, ball);
    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);