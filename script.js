const canvas = document.getElementById('canvas')
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;
const blip = new Audio('blip.wav')
var score = 0
var streak = 0
var aiscore = 0
var aiLocation = {
    x: (window.innerWidth-30),
    y: 0
}
var ballLocation = {
    x: (window.innerWidth / 2),
    y: (window.innerHeight / 2),
    radius: 20
}
if(canvas.getContext){
    var moveSpeed = 20
    const ctx = canvas.getContext('2d')
    ctx.font = '48px serif'
    ctx.fillStyle = "#FFFFFF"
    var xPos = 0
    var yPos = 0
    ctx.fillRect(0,0,30,400)
    document.onkeydown = move
    const ballLoop = setInterval(moveBall, 5)
    var ballSpeed = 3
    var ballDirection = {
        left: false,
        up: true
    }
    
    function moveBall(){
        // console.log(ballDirection)
        var loc = ballLocation
        // console.log('streak speed: ' + (streak))
        if((streak) > ballSpeed){
            ballSpeed = (streak)
            moveSpeed = moveSpeed+(streak*2)
        }else {
            ballSpeed = 3
            moveSpeed = 15
        }
        if(loc.x <= 0){
            blip.currentTime = 0;
            blip.play();
            if(loc.y > yPos && loc.y < (yPos + 400)){
                streak+=1
            }else{
                aiscore+=1
                console.log('ai score is now: '+score)
                streak = 0
                ballLocation.x = (window.innerWidth / 2)
                ballLocation.y = 500000
                // blip.pause()
                setTimeout(() => {
                    ballLocation.x = (window.innerWidth / 2)
                    ballLocation.y = (window.innerHeight / 2)
                }, 2000)
            }
            loc.x+=ballSpeed
            ballDirection.left = false
        }else
        if(loc.x >= window.innerWidth - 20){
            blip.currentTime = 0;
            blip.play();
            if(loc.y > aiLocation.y && loc.y < (aiLocation.y + 400)){
                
            }else{
                score+=1
                console.log('your score is now: '+score)
                streak = 0
                ballLocation.x = (window.innerWidth / 2)
                ballLocation.y = 500000
                // blip.pause()
                setTimeout(() => {
                    ballLocation.x = (window.innerWidth / 2)
                    ballLocation.y = (window.innerHeight / 2)
                }, 2000)
                
            }
            loc.x-=ballSpeed
            ballDirection.left = true
        }else
        if(loc.y <= 0){
            blip.currentTime = 0;
            blip.play();
            loc.y+=ballSpeed
            ballDirection.up = false
        }else
        if(loc.y >= window.innerHeight - 20){
            blip.currentTime = 0;
            blip.play();
            loc.y-=ballSpeed
            ballDirection.up = true
        }else{
            if(ballDirection.up == true){
                loc.y-=ballSpeed
            }else
            if(ballDirection.up == false){
                loc.y+=ballSpeed
            }
            if(ballDirection.left == true){
                loc.x-=ballSpeed
            }else
            if(ballDirection.left == false){
                loc.x+=ballSpeed
            }
        }
        canvas.width=canvas.width
        ctx.fillStyle = "#FFFFFF"
        ctx.font = '48px arial'
        ctx.fillRect(xPos,yPos,30,400)
        ctx.fillRect((window.innerWidth / 2),0,10,window.innerHeight)
        ctx.fillRect(aiLocation.x,aiLocation.y,30,400)
        ctx.fillText(score, ((window.innerWidth / 2) - 100), 50);
        ctx.fillText(aiscore, ((window.innerWidth / 2) + 100), 50);
        ctx.beginPath()
        ctx.arc(ballLocation.x, ballLocation.y, ballLocation.radius, 0, 2 * Math.PI)
        ctx.fill()
    }
    const aiLoop = setInterval(moveAI, 5)
    var aiDirection = 'down'
    function moveAI(){
        // console.log(aiDirection)
        var loc = aiLocation
        if(loc.y <= 0){
            loc.y+=ballSpeed
            aiDirection = 'down'
        }else
        if(loc.y >= window.innerHeight - 400){
            loc.y-=ballSpeed
            aiDirection = 'up'
        }else{
            if(aiDirection == 'up'){
                loc.y-=ballSpeed
            }else
            if(aiDirection == 'down'){
                loc.y+=ballSpeed
            }
        }
        canvas.width=canvas.width
        ctx.fillStyle = "#FFFFFF"
        ctx.font = '48px arial'
        ctx.fillRect(xPos,yPos,30,400)
        ctx.fillRect((window.innerWidth / 2),0,10,window.innerHeight)
        ctx.fillRect(aiLocation.x,aiLocation.y,30,400)
        ctx.fillText(score, ((window.innerWidth / 2) - 100), 50);
        ctx.fillText(aiscore, ((window.innerWidth / 2) + 100), 50);
        ctx.beginPath()
        ctx.arc(ballLocation.x, ballLocation.y, ballLocation.radius, 0, 2 * Math.PI)
        ctx.fill()
    }

    function move(e){
        // alert(e.keyCode)
        if(e.keyCode==38 || e.keyCode == 87){
            if(yPos <= 0) return
            yPos-=moveSpeed
        }else
        if(e.keyCode==40 || e.keyCode == 83){
            if(yPos >= window.innerHeight - 400) return
            yPos+=moveSpeed
        }else return
        canvas.width=canvas.width
        ctx.fillStyle = "#FFFFFF"
        ctx.font = '48px arial'
        ctx.fillRect(xPos,yPos,30,400)
        ctx.fillRect((window.innerWidth / 2),0,10,window.innerHeight)
        ctx.fillRect(aiLocation.x,aiLocation.y,30,400)
        ctx.fillText(score, ((window.innerWidth / 2) - 100), 50);
        ctx.fillText(aiscore, ((window.innerWidth / 2) + 100), 50);
        ctx.beginPath()
        ctx.arc(ballLocation.x, ballLocation.y, ballLocation.radius, 0, 2 * Math.PI)
        ctx.fill()
    }

    ctx.fillRect(aiLocation.x,aiLocation.y,30,400)
    ctx.beginPath()
    ctx.arc(ballLocation.x, ballLocation.y, 20, 0, 2 * Math.PI)
    ctx.fill()
    function gameOver(score){
        console.log('Game Over')
        clearInterval(ballLoop)
        clearInterval(aiLoop)
        document.onkeydown = () => {
            console.log('Cannot move, game is over')
        }
    }
}else{
    console.error("canvas has failed to load, alerting user...")
    alert('Game is unsupported in this browser')
}
