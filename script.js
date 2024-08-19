console.log("Welcome to Traffic Game.");

//checks that there is a playcontainer in dom
const playContainer = document.querySelector(".play-container");
console.log(playContainer);

//check for notify sign div in HTML
const notifySign = document.querySelector(".notify-sign");
//created an image element
const signImageNotify = document.createElement("img");
//appends it to the notify-sign div
notifySign.appendChild(signImageNotify);

//container for poles
let poleContainer;

const maxSignSize = 180; // Limits the sign size in pixels
let timer = 5;
let baseTimer = 5; // starting time for the first round
let timerDecrease = 0.2;
let timerInterval;
let notifySrc = "";
let newGame = true; 

//INITIALIZE GAME STATE

// Retrieve game state from storage or set default values
const storedNumSigns = sessionStorage.getItem("numSigns");
const storedRoundNumber = sessionStorage.getItem("currentRound");
const storedScore = sessionStorage.getItem("currentScore");
const storedHighScore = localStorage.getItem("highScore");

let gameStatus = true;
sessionStorage.setItem("gameStatus", gameStatus.toString());

console.log("SESSION STORAGE");
console.log(
  storedNumSigns,
  storedRoundNumber,
  storedScore,
  gameStatus,
  storedHighScore
);

// Initialize game variables
let numSigns = storedNumSigns ? parseInt(storedNumSigns, 10) : 10;
let roundNumber = storedRoundNumber ? parseInt(storedRoundNumber, 10) : 0;
let score = storedScore ? parseInt(storedScore, 10) : 0;
let highScore = storedHighScore ? parseInt(storedHighScore, 10) : 0;

// Update UI based on the retrieved values
updateScoreDisplay();
updateRoundDisplay(roundNumber);

//random int function
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//called when next round is started
function nextRound() {
  //update round number UI
  roundNumber++;
  sessionStorage.setItem("currentRound", roundNumber.toString());

  document.getElementById("roundCounter").textContent = "Round " + roundNumber;
  //get new notify sign
  newNotify();
  //fill up play container div with new random signs
  populateGame();
}

//get a new sign image
function newNotify() {
  //get a random image src to be the notify sign
  notifySrc = `./assets/signs/image_${getRandomInt(1, 611)}.png`;
  //set the notify-sign in the header to have that source
  signImageNotify.src = notifySrc;
  signImageNotify.alt = "Traffic sign";
}

//beta distribution function for placing signs
function betaDistribution(alpha, beta) {
  let u = Math.random();
  let v = Math.random();
  let x = Math.pow(u, 1 / alpha);
  let y = Math.pow(v, 1 / beta);
  return x / (x + y);
}

//function checking overlapping
function isOverlapping(newPos, newSize, existingPositions) {
  //iterate through existing positions list
  for (let item of existingPositions) {
    if (
      newPos.x < item.pos.x + item.size.width &&
      newPos.x + newSize.width > item.pos.x &&
      newPos.y < item.pos.y + item.size.height &&
      newPos.y + newSize.height > item.pos.y
    ) {
      return true;
    }
  }
  return false;
}

//making sure image doesnt exceed max w or h
async function createScaledSignElement(src) {
  //make a new Image element
  const img = new Image();
  //assign it a source
  img.src = src;
  //waits for image to fully load
  await new Promise((resolve) => (img.onload = resolve));

  //gets its height and width
  let width = img.naturalWidth;
  let height = img.naturalHeight;
  //creates a scale factor by dividing existing dimentions
  const scaleFactor = Math.min(maxSignSize / width, maxSignSize / height, 1);

  //multiplies each by scale factor
  width *= scaleFactor;
  height *= scaleFactor;

  //sets new image height and width
  img.width = width;
  img.height = height;
  //returns image element
  return img;
}

//2D packing greedy algorithm
function packSigns(
  signs,
  containerWidth,
  containerHeight,
  allowOverflow = false
) {
  //list of positons
  const positions = [];
  //makes an array where each item has object literals
  const spaces = [{ x: 0, y: 0, w: containerWidth, h: containerHeight }];
  //defines the center of play container as an x value
  const centerX = containerWidth / 2;
  //defines the center of play container as a y value
  const centerY = containerHeight / 2;

  // Sort signs by area in descending order
  //signs.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  //for loop goes through each image element in signs
  for (const sign of signs) {
    let bestSpace = null; //no existing best space yet
    let bestScore = Infinity; //infinite best score

    //runs through number of spaces, which will initially not run
    for (let i = spaces.length - 1; i >= 0; i--) {
      //defines space as what is empty of the container
      const space = spaces[i];
      //sees if the sign is less wide than the space and less tall than the space
      if (space.w >= sign.width && space.h >= sign.height) {
        //assigns a fitscore dependding on difference between space w and sign w, and diff between spcace h and sign h
        const fitScore = Math.max(space.w - sign.width, space.h - sign.height);
        //assigns a centrality score
        const centralityScore = calculateDistance(
          space,
          sign,
          centerX,
          centerY,
          containerWidth,
          containerHeight
        );
        const score = fitScore + centralityScore * 50;

        //updates best spaces and scores
        if (score < bestScore) {
          bestSpace = space;
          bestScore = score;
        }
      }
    }

    //if there is a best space, push x positions there
    if (bestSpace) {
      positions.push({
        x: bestSpace.x,
        y: bestSpace.y,
        width: sign.width,
        height: sign.height,
      });
      updateSpaces(bestSpace, sign, spaces);
    } else {
      const position = randomPosition(
        sign,
        centerX,
        centerY,
        containerWidth,
        containerHeight
      );
      positions.push(position);
    }
  }

  return positions;
}

function updateSpaces(bestSpace, sign, spaces) {
  if (bestSpace.w - sign.width > 0) {
    spaces.push({
      x: bestSpace.x + sign.width,
      y: bestSpace.y,
      w: bestSpace.w - sign.width,
      h: sign.height,
    });
  }
  if (bestSpace.h - sign.height > 0) {
    spaces.push({
      x: bestSpace.x,
      y: bestSpace.y + sign.height,
      w: bestSpace.w,
      h: bestSpace.h - sign.height,
    });
  }
  spaces.splice(spaces.indexOf(bestSpace), 1);
}

function calculateDistance(
  space,
  sign,
  centerX,
  centerY,
  containerWidth,
  containerHeight
) {
  const spaceCenterX = space.x + space.w / 2;
  const spaceCenterY = space.y + space.h / 2;
  return (
    Math.sqrt(
      Math.pow(spaceCenterX - centerX, 2) + Math.pow(spaceCenterY - centerY, 2)
    ) /
    Math.sqrt(
      containerWidth * containerWidth + containerHeight * containerHeight
    )
  );
}

function randomPosition(
  sign,
  centerX,
  centerY,
  containerWidth,
  containerHeight
) {
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * Math.min(containerWidth, containerHeight);

  // Dynamic bias for more variance
  let biasX = 50 + Math.random() * 30; // Adds 50 to 80 pixels bias to the right
  let biasY = 50 + Math.random() * 30; // Adds 50 to 80 pixels bias downwards

  // Calculate x and y with dynamic bias adjustments
  let x = centerX + Math.cos(angle) * distance - sign.width / 2 + biasX;
  let y = centerY + Math.sin(angle) * distance - sign.height / 2 + biasY;

  // Ensure the sign stays within the boundaries of the container
  x = Math.max(0, Math.min(containerWidth - sign.width, x));
  y = Math.max(0, Math.min(containerHeight - sign.height, y));

  return {
    x: x,
    y: y,
    width: sign.width,
    height: sign.height,
  };
}

baseURL = window.location.origin;

function initializePoleContainer() {
  if (!poleContainer) {
    poleContainer = document.createElement("div");
    poleContainer.className = "pole-container";
    document.body.appendChild(poleContainer);
  } else {
    poleContainer.innerHTML = ""; // Clear existing poles
  }
}

async function populateGame() {
  playContainer.innerHTML = "";
  const containerRect = playContainer.getBoundingClientRect();

  initializePoleContainer();

  //generate src for imgs
  let imgList = [];
  for (let i = 0; i < numSigns; i++) {
    let newSignSrc = `./assets/signs/image_${getRandomInt(1, 611)}.png`;
    if (newSignSrc !== notifySrc) {
      imgList.push(newSignSrc);
    }
  }

  //insert notify to list
  let notifyLoc = getRandomInt(0, imgList.length);
  imgList.splice(notifyLoc, 0, notifySrc);

  //scale if needed and get all img elements into signElements
  const signElements = await Promise.all(imgList.map(createScaledSignElement));

  // Use a smaller width and height for packing to ensure signs fit within the container
  const packedPositions = packSigns(
    signElements,
    containerRect.width,
    containerRect.height
  );

  console.log("start here");

  packedPositions.forEach((position, index) => {
    const sign = signElements[index];
    sign.style.position = "absolute";
    sign.style.left = `${position.x}px`;
    sign.style.top = `${position.y}px`;
    sign.style.zIndex = "2";

    fixedSign = sign.src.replace(baseURL, "");
    fixedSign = `.${fixedSign}`;

    if (fixedSign === notifySrc) {
      console.log("MATCH FOUND");
      sign.style.zIndex = "100";
      sign.setAttribute("id", "WHERE");
      sign.addEventListener("click", () => {
        correctClick();
      });
    } else {
      sign.addEventListener("click", () => losePoints(1));
    }

    // Create and position the pole element
    const pole = document.createElement("div");
    pole.className = "pole";
    const playContainerOffset = playContainer.getBoundingClientRect();
    const poleX = playContainerOffset.left + position.x + sign.width / 2;
    const poleY = playContainerOffset.top + position.y;
    pole.style.left = `${poleX}px`;
    pole.style.top = `${poleY}px`;
    pole.style.height = `calc(100vh - ${poleY}px)`;

    poleContainer.appendChild(pole);
    playContainer.appendChild(sign);
  });

  const roadContainer = document.getElementById("road-container");
  if (roadContainer) {
    roadContainer.style.position = "relative";
    roadContainer.style.zIndex = "2";
  }

  numSigns += 3;
}

function correctClick(){
  const remainingTime = Math.ceil(timer);
  addPoints(remainingTime + 1);
  updateUI();
}

function createPointsAnimation(amount, isPositive) {
  const scoreElement = document.getElementById("score");
  if (!scoreElement) return; // Exit if score element doesn't exist

  const pointsAdded = document.createElement("div");
  pointsAdded.className = 'points-animation';
  pointsAdded.textContent = isPositive ? `+${amount}` : `-${amount}`;
  pointsAdded.style.color = isPositive ? '#14e40d' : '#5df763';
  
  // Position the animation element
  const rect = scoreElement.getBoundingClientRect();
  pointsAdded.style.position = 'absolute';
  pointsAdded.style.left = `${rect.left + 15}px`;
  pointsAdded.style.top = `${rect.bottom + 50}px`; 
  
  document.body.appendChild(pointsAdded);

  // Start the animation
  requestAnimationFrame(() => {
    pointsAdded.style.transform = `translateY(-${rect.height + 15}px)`;
    pointsAdded.style.opacity = '0';
    pointsAdded.style.transition = 'transform 1s ease-out, opacity 1s ease-out';
  });

  // Remove the element after animation
  setTimeout(() => {
    pointsAdded.remove();
  }, 1000);
}

function losePoints(int) {
  score -= Math.round(int);
  sessionStorage.setItem("currentScore", score.toString());
  updateScoreDisplay();
  createPointsAnimation(Math.round(int), false);
  if (score < 0) {
    endGame();
  }
}

function addPoints(int) {
  score += Math.round(int);
  sessionStorage.setItem("currentScore", score.toString());
  updateScoreDisplay();
  createPointsAnimation(Math.round(int), true);
}




function loadHighScore() {
  let storedHighScore = localStorage.getItem("highScore");
  if (storedHighScore === null) {
    highScore = 0;
  } else {
    highScore = parseInt(storedHighScore, 10);
  }
  updateScoreDisplay();
}

function checkHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore.toString());
    updateScoreDisplay();
  }
}

function calculateCentroid(positions, elements) {
  let totalX = 0,
    totalY = 0,
    totalArea = 0;
  positions.forEach((pos, index) => {
    const element = elements[index];
    const area = element.width * element.height;
    totalX += (pos.x + element.width / 2) * area;
    totalY += (pos.y + element.height / 2) * area;
    totalArea += area;
  });
  return { x: totalX / totalArea, y: totalY / totalArea };
}

function calculateBoundingBox(positions, elements) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  positions.forEach((pos, index) => {
    const element = elements[index];
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + element.width);
    maxY = Math.max(maxY, pos.y + element.height);
  });

  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function updateTimerDisplay() {
  const timerValueElement = document.getElementById("timerValue");
  if (timerValueElement) {
    timerValueElement.textContent = "  " + timer;
    // Add the pulse animation
    timerValueElement.classList.add('pulse');
    // Remove the pulse class after the animation completes
    setTimeout(() => {
      timerValueElement.classList.remove('pulse');
    }, 300); // This should match the animation duration
  }
}

function endGame() {
  gameStatus = false;
  sessionStorage.setItem("gameStatus", gameStatus.toString());

  checkHighScore();

  const timerElement = document.querySelector('.left');
  timerElement.style.borderColor = 'rgba(241, 59, 59, 0)';
  timerElement.style.visibility ='hidden';

  clearInterval(timerInterval);
  showGameOverModal();
  if (score > highScore) {
    highScore = score;
  }
  console.log("Game ended, modal should be visible");
}

let modalClickHandler = null;
let actionContainerClickHandler = null;

function showGameOverModal() {
  const modal = document.getElementById("gameOverModal");
  const signs = document.querySelector(".play-container");
  const notify = document.querySelector(".notify-sign");
  const instr = document.querySelector("#instructions");

  //clear gameplay
  signs.style.visibility = "hidden";
  notify.style.display = "none";
  notify.style.border = "none";
  poleContainer.innerHTML= "";
  instr.style.display = "none";

  console.log(signs);
  const stateText = document.querySelector(".game-over-text");
  stateText.innerHTML = "Game Over!";

  const exit = document.querySelector(".exit-text");
  exit.innerHTML = "EXIT";

  const highway = document.querySelector(".highway-text");
  highway.innerHTML = "HIGHWAY";

  modal.style.display = "block";


  // Remove existing listener if any
  if (modalClickHandler) {
    modal.removeEventListener("click", modalClickHandler);
  }

  // Create a new handler and add it
  modalClickHandler = () => {
    updateModal();
  };
  modal.addEventListener("click", modalClickHandler);
}

function updateModal() {
  const arrowhead = document.querySelector(".arrow-head");
  arrowhead.style.display = "none";

  const arrow = document.querySelector(".arrow-body");
  arrow.style.display = "none";

  const stateText = document.querySelector(".game-over-text");
  if (score > highScore) {
    stateText.innerHTML = "New High Score! " + highScore;
  } else {
    stateText.innerHTML = "Your Score: " + score;
    const hsDisplay = document.createElement("div");
    hsDisplay.innerHTML = " High Score: " + highScore;
    stateText.appendChild(hsDisplay);
  }
  

  const exit = document.querySelector(".exit-text");
  exit.innerHTML = "PLAY";

  const highway = document.querySelector(".highway-text");
  highway.innerHTML = "AGAIN";

  const actionContainer = document.querySelector(".exit-sign-container");
  actionContainer.style.height = "60px";
  // Update for high score and play again

  // Add event listener to PLAY AGAIN text
  // Remove existing listener if any
  if (actionContainerClickHandler) {
    actionContainer.removeEventListener("click", actionContainerClickHandler);
  }

  // Create a new handler and add it
  actionContainerClickHandler = handleRestart;
  actionContainer.addEventListener("click", actionContainerClickHandler);

  console.log(actionContainer); // Log to ensure updates are made
}

function restartGame() {
  const modal = document.getElementById("gameOverModal");
  const actionContainer = document.querySelector(".exit-sign-container");
  const signs = document.querySelector(".play-container");
  const notify = document.querySelector(".notify-sign");
  const instr = document.querySelector("#instructions");
  
  //remove click
  actionContainer.removeEventListener("click", handleRestart);
  //get rid of pop up modal
  modal.style.display = 'none';

  //reinstate timer
  const timerElement = document.querySelector('.left');
  timerElement.style.visibility = 'visible';
  timerElement.style.borderColor = '#f13b3b';

  //make blocks visible again
  signs.style.visibility = 'visible';
  notify.style.display = 'flex';
  instr.style.display = 'flex';

  //reset modal events
  if (modalClickHandler) {
    modal.removeEventListener("click", modalClickHandler);
    modalClickHandler = null;
  }
  if (actionContainerClickHandler) {
    actionContainer.removeEventListener("click", actionContainerClickHandler);
    actionContainerClickHandler = null;
  }
  
  // Reset game state
  baseTimer = 5;
  score = 0;
  roundNumber = 0;
  numSigns = 10;
  sessionStorage.setItem("storedNumSigns", numSigns.toString());

  updateScoreDisplay();
  updateRoundDisplay(roundNumber);

  newGame = true;
  updateUI();
}

function handleRestart() {
  console.log("Restarting game...");
  endGame();
  restartGame();
  newGame = true;
}

function runTimer() {
  clearInterval(timerInterval);
  
  // Calculate the new timer value based on the round number
  timer = Math.max(baseTimer - (roundNumber * timerDecrease), 1);
  
  updateTimerDisplay();
  newGame = false;

  timerInterval = setInterval(() => {
    timer -= 0.1; 
    updateTimerDisplay();

    if (timer <= 0) {
      clearInterval(timerInterval);
      endGame();
    }
  }, 100); 
}


function updateTimerDisplay() {
  const timerValueElement = document.getElementById("timerValue");
  if (timerValueElement) {
    const displaySeconds = Math.ceil(timer); // Round up to nearest second
    timerValueElement.textContent = "  " + displaySeconds;
    
    if (displaySeconds !== parseInt(timerValueElement.textContent)) {
      timerValueElement.classList.add('pulse');
      setTimeout(() => {
        timerValueElement.classList.remove('pulse');
      }, 300);
    }
  }
}

//separated into a function so it can also include updates to the scenes as we implement them
function updateUI() {
  if (newGame) {
    roundNumber = 0;
    score = 0;
    const timerElement = document.querySelector('.left');
    timerElement.style.display = 'flex';
  }
  nextRound();
  runTimer();
}

function startGame() {
  updateUI();
}

//both score and highscore always on display
function updateScoreDisplay() {
  const scoreElement = document.getElementById("score");
  const highScoreElement = document.getElementById("highScore");
  if (scoreElement) {
    scoreElement.textContent = `Score: ${score}`;
  }
  if (highScoreElement) {
    highScoreElement.textContent = `High Score: ${highScore}`;
  }
}

function updateRoundDisplay(roundNumber) {
  const roundCounterElement = document.getElementById("roundCounter");
  if (roundCounterElement) {
    roundCounterElement.textContent = `Round: ${roundNumber}`;
  }
}

function loadHighScore() {
  let storedHighScore = localStorage.getItem("highScore");
  if (storedHighScore === null) {
    highScore = 0; // No high score yet, start from zero
  } else {
    highScore = parseInt(storedHighScore, 10);
  }

  //updateHighScoreDisplay();
}

function updateHighScoreDisplay() {
  const highScoreElement = document.getElementById("highScoreDisplay"); // Assuming you have this element
  if (highScoreElement) {
    highScoreElement.textContent = `High Score: ${highScore}`;
  }
}



function checkHighScore() {
  const storedHighScore = parseInt(
    localStorage.getItem("highScore") || "0",
    10
  );
  if (score > storedHighScore) {
    localStorage.setItem("highScore", score.toString());
    updateHighScoreDisplay();  
  }
}

document.addEventListener("DOMContentLoaded", function() {
  const storedScore = sessionStorage.getItem("currentScore");
  if (storedScore !== null) {
    score = parseInt(storedScore, 10);
  }
  loadHighScore();
  updateScoreDisplay();
});

window.addEventListener('load', startGame);
