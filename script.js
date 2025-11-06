const GRID_SIZE = 4;
const START_TILES = 2;
const WIN_TILE = 2048;
const BEST_SCORE_KEY = "brainrot-best-score";

const directions = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  s: "down",
  S: "down",
  a: "left",
  A: "left",
  d: "right",
  D: "right",
};

const gridElement = document.getElementById("grid");
const scoreElement = document.getElementById("score");
const bestElement = document.getElementById("best");
const newGameButton = document.getElementById("new-game");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");

let board = [];
let score = 0;
let bestScore = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
let hasWon = false;
let inputLocked = false;

bestElement.textContent = bestScore;

function createBoard() {
  board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function eachCell(callback) {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      callback(row, col, board[row][col]);
    }
  }
}

function getEmptyCells() {
  const empties = [];
  eachCell((row, col, value) => {
    if (value === 0) {
      empties.push({ row, col });
    }
  });
  return empties;
}

function randomEmptyCell() {
  const empties = getEmptyCells();
  if (empties.length === 0) return null;
  return empties[Math.floor(Math.random() * empties.length)];
}

function addRandomTile() {
  const cell = randomEmptyCell();
  if (!cell) return null;
  const value = Math.random() < 0.85 ? 2 : 4;
  board[cell.row][cell.col] = value;
  return { ...cell, value };
}

function setScore(newScore) {
  score = newScore;
  scoreElement.textContent = score;
  if (score > bestScore) {
    bestScore = score;
    bestElement.textContent = bestScore;
    localStorage.setItem(BEST_SCORE_KEY, bestScore);
  }
}

function buildGridBackground() {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i += 1) {
    const cell = document.createElement("div");
    cell.className = "cell";
    fragment.appendChild(cell);
  }
  gridElement.appendChild(fragment);
}

function renderBoard({ highlight } = {}) {
  const highlightKey = highlight ? `${highlight.row}-${highlight.col}` : null;

  gridElement.querySelectorAll(".tile").forEach((tile) => tile.remove());

  const fragment = document.createDocumentFragment();

  eachCell((row, col, value) => {
    if (!value) return;
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.dataset.value = value;
    tile.textContent = value;
    tile.style.setProperty("--x", col);
    tile.style.setProperty("--y", row);

    if (`${row}-${col}` === highlightKey) {
      tile.classList.add("new");
    }

    fragment.appendChild(tile);
  });

  gridElement.appendChild(fragment);
}

function slideRowLeft(row) {
  const filtered = row.filter((value) => value !== 0);
  const result = [];
  let gained = 0;

  for (let i = 0; i < filtered.length; i += 1) {
    const current = filtered[i];
    const next = filtered[i + 1];
    if (current && current === next) {
      const merged = current * 2;
      result.push(merged);
      gained += merged;
      i += 1;
    } else {
      result.push(current);
    }
  }

  while (result.length < GRID_SIZE) {
    result.push(0);
  }

  return { row: result, gained };
}

function applyMove(direction) {
  const newBoard = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  let moved = false;
  let totalGain = 0;

  const compareAndAssign = (rowIndex, newRow) => {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (!moved && newRow[col] !== board[rowIndex][col]) {
        moved = true;
      }
      newBoard[rowIndex][col] = newRow[col];
    }
  };

  switch (direction) {
    case "left": {
      for (let row = 0; row < GRID_SIZE; row += 1) {
        const { row: newRow, gained } = slideRowLeft(board[row]);
        totalGain += gained;
        compareAndAssign(row, newRow);
      }
      break;
    }
    case "right": {
      for (let row = 0; row < GRID_SIZE; row += 1) {
        const reversed = [...board[row]].reverse();
        const { row: newRow, gained } = slideRowLeft(reversed);
        totalGain += gained;
        const restored = newRow.reverse();
        for (let col = 0; col < GRID_SIZE; col += 1) {
          if (!moved && restored[col] !== board[row][col]) {
            moved = true;
          }
          newBoard[row][col] = restored[col];
        }
      }
      break;
    }
    case "up": {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const column = board.map((row) => row[col]);
        const { row: newColumn, gained } = slideRowLeft(column);
        totalGain += gained;
        for (let row = 0; row < GRID_SIZE; row += 1) {
          if (!moved && newColumn[row] !== board[row][col]) {
            moved = true;
          }
          newBoard[row][col] = newColumn[row];
        }
      }
      break;
    }
    case "down": {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const column = board.map((row) => row[col]).reverse();
        const { row: newColumn, gained } = slideRowLeft(column);
        totalGain += gained;
        const restored = newColumn.reverse();
        for (let row = 0; row < GRID_SIZE; row += 1) {
          if (!moved && restored[row] !== board[row][col]) {
            moved = true;
          }
          newBoard[row][col] = restored[row];
        }
      }
      break;
    }
    default:
      return { moved: false, board: board.map((row) => [...row]), gained: 0 };
  }

  return { moved, board: newBoard, gained: totalGain };
}

function isGameOver() {
  if (getEmptyCells().length > 0) return false;

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const value = board[row][col];
      const neighbors = [
        board[row]?.[col + 1],
        board[row]?.[col - 1],
        board[row + 1]?.[col],
        board[row - 1]?.[col],
      ];
      if (neighbors.some((neighbor) => neighbor === value)) {
        return false;
      }
    }
  }
  return true;
}

function move(direction) {
  const { moved, board: newBoard, gained } = applyMove(direction);
  if (!moved) return;

  board = newBoard;
  setScore(score + gained);

  const highlight = addRandomTile();
  renderBoard({ highlight });

  if (!hasWon && board.some((row) => row.some((value) => value >= WIN_TILE))) {
    hasWon = true;
    showModal("Vittoria delirante!", "Você chegou ao 2048. Continue se quiser ampliar o brainrot.");
  }

  if (isGameOver()) {
    showModal("Fim do delírio", "Não há mais movimentos possíveis. Aperte Novo delírio para tentar novamente.");
  }
}

function startGame() {
  createBoard();
  setScore(0);
  hasWon = false;
  gridElement.querySelectorAll(".tile").forEach((tile) => tile.remove());
  for (let i = 0; i < START_TILES; i += 1) {
    addRandomTile();
  }
  renderBoard();
}

function handleKeyDown(event) {
  if (inputLocked || modal.open) return;
  const direction = directions[event.key];
  if (!direction) return;
  event.preventDefault();
  inputLocked = true;
  requestAnimationFrame(() => {
    move(direction);
    inputLocked = false;
  });
}

function handleNewGame() {
  startGame();
}

function showModal(title, message) {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  if (typeof modal.showModal === "function" && !modal.open) {
    modal.showModal();
  }
}

function initTouchControls() {
  let touchStartX = null;
  let touchStartY = null;

  gridElement.addEventListener("touchstart", (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  });

  gridElement.addEventListener("touchend", (event) => {
    if (touchStartX === null || touchStartY === null) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) < 24) {
      touchStartX = null;
      touchStartY = null;
      return;
    }

    const direction = absDx > absDy ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    move(direction);

    touchStartX = null;
    touchStartY = null;
  });
}

function handleGlobalShortcuts() {
  document.addEventListener("keydown", (event) => {
    if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      startGame();
    }
  });
}

function setupModalClose() {
  modal.addEventListener("close", () => {
    inputLocked = false;
  });
}

function setup() {
  buildGridBackground();
  startGame();
  document.addEventListener("keydown", handleKeyDown);
  newGameButton.addEventListener("click", handleNewGame);
  initTouchControls();
  handleGlobalShortcuts();
  setupModalClose();
}

document.addEventListener("DOMContentLoaded", setup);
