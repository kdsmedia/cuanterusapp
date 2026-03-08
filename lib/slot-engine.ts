/**
 * Self-contained HTML5 Slot Game Engine
 * Runs entirely inside WebView — no external server needed
 * Communicates balance changes back to React Native via postMessage
 */

export interface SlotGameConfig {
  gameId: string;
  displayName: string;
  balance: number;
  symbols: string[];       // emoji symbols
  symbolNames: string[];   // symbol display names
  reelCount: number;       // typically 5
  rowCount: number;        // typically 3
  bets: number[];          // available bet amounts
  paytable: Record<string, number[]>; // symbol -> [0, 0, match3, match4, match5]
  wildSymbol?: number;     // index of wild symbol
  scatterSymbol?: number;  // index of scatter symbol
  themeColor: string;      // hex color
  bgGradient: [string, string]; // gradient colors
}

// ===== GAME CONFIGS =====

const GAME_THEMES: Record<string, Partial<SlotGameConfig>> = {
  GatesofOlympus: {
    displayName: 'Gates of Olympus',
    symbols: ['⚡', '👑', '💍', '⏳', '🔮', '💎', '💚', '💙', '❤️', '🟡', '⭐'],
    symbolNames: ['Zeus', 'Crown', 'Ring', 'Hourglass', 'Orb', 'Gem', 'Green', 'Blue', 'Red', 'Gold', 'Scatter'],
    themeColor: '#f59e0b',
    bgGradient: ['#1a0a2e', '#2d1b69'],
  },
  SweetBonanza: {
    displayName: 'Sweet Bonanza',
    symbols: ['🍭', '🍬', '🍩', '🍪', '🧁', '🍌', '🍇', '🍎', '🫐', '🍑', '💣'],
    symbolNames: ['Lollipop', 'Candy', 'Donut', 'Cookie', 'Cupcake', 'Banana', 'Grape', 'Apple', 'Berry', 'Peach', 'Bomb'],
    themeColor: '#ec4899',
    bgGradient: ['#2d0a1e', '#4a1942'],
  },
  StarlightPrincess: {
    displayName: 'Starlight Princess',
    symbols: ['👸', '⭐', '💎', '❤️', '💜', '🌙', '💫', '🔵', '🟢', '🟡', '✨'],
    symbolNames: ['Princess', 'Star', 'Diamond', 'Heart', 'Purple', 'Moon', 'Sparkle', 'Blue', 'Green', 'Gold', 'Scatter'],
    themeColor: '#a855f7',
    bgGradient: ['#1a0533', '#3b1261'],
  },
  BonanzaGold: {
    displayName: 'Bonanza Gold',
    symbols: ['💰', '🪙', '💎', '🏺', '🔔', '🍒', '🍋', '🍊', '🍇', '💜', '⭐'],
    symbolNames: ['Gold', 'Coin', 'Diamond', 'Pot', 'Bell', 'Cherry', 'Lemon', 'Orange', 'Grape', 'Purple', 'Scatter'],
    themeColor: '#eab308',
    bgGradient: ['#1a1400', '#3d2e00'],
  },
  WildWestGold: {
    displayName: 'Wild West Gold',
    symbols: ['🤠', '🔫', '💰', '🐴', '🌵', '🍺', '🎯', 'A', 'K', 'Q', '⭐'],
    symbolNames: ['Cowboy', 'Gun', 'Money', 'Horse', 'Cactus', 'Beer', 'Target', 'Ace', 'King', 'Queen', 'Scatter'],
    themeColor: '#d97706',
    bgGradient: ['#1a0e00', '#3d2600'],
  },
  TheDogHouse: {
    displayName: 'The Dog House',
    symbols: ['🐶', '🦴', '🏠', '🐕', '🐩', '🎀', '💎', 'A', 'K', 'Q', '🐾'],
    symbolNames: ['Dog', 'Bone', 'House', 'Puppy', 'Poodle', 'Bow', 'Diamond', 'Ace', 'King', 'Queen', 'Paw'],
    themeColor: '#2563eb',
    bgGradient: ['#0a1628', '#1e3a5f'],
  },
  ChilliHeat: {
    displayName: 'Chilli Heat',
    symbols: ['🌶️', '💃', '🐕', '🎸', '🌮', '💎', '🔔', 'A', 'K', 'Q', '💰'],
    symbolNames: ['Chilli', 'Dancer', 'Chihuahua', 'Guitar', 'Taco', 'Diamond', 'Bell', 'Ace', 'King', 'Queen', 'Money'],
    themeColor: '#dc2626',
    bgGradient: ['#1a0505', '#3d0e0e'],
  },
  MadameDestiny: {
    displayName: 'Madame Destiny',
    symbols: ['🔮', '🃏', '🕯️', '💀', '🌙', '💎', '🔔', 'A', 'K', 'Q', '⭐'],
    symbolNames: ['Crystal', 'Cards', 'Candle', 'Skull', 'Moon', 'Diamond', 'Bell', 'Ace', 'King', 'Queen', 'Scatter'],
    themeColor: '#7c3aed',
    bgGradient: ['#120a2e', '#2a1854'],
  },
  SafariKing: {
    displayName: 'Safari King',
    symbols: ['🦁', '🐘', '🦒', '🦓', '🌳', '💎', '🔔', 'A', 'K', 'Q', '⭐'],
    symbolNames: ['Lion', 'Elephant', 'Giraffe', 'Zebra', 'Tree', 'Diamond', 'Bell', 'Ace', 'King', 'Queen', 'Scatter'],
    themeColor: '#ca8a04',
    bgGradient: ['#1a1200', '#3d2c00'],
  },
  AztecGemsDeluxe: {
    displayName: 'Aztec Gems Deluxe',
    symbols: ['🗿', '💎', '🟢', '🔴', '🔵', '🟡', '💜', '🟠', '⭐'],
    symbolNames: ['Totem', 'Diamond', 'Green', 'Red', 'Blue', 'Gold', 'Purple', 'Orange', 'Scatter'],
    reelCount: 3,
    rowCount: 3,
    themeColor: '#059669',
    bgGradient: ['#0a1a12', '#1a3d2c'],
  },
  CandyVillage: {
    displayName: 'Candy Village',
    symbols: ['🏠', '🍭', '🍬', '🍫', '🧁', '🍩', '💎', 'A', 'K', 'Q', '⭐'],
    symbolNames: ['House', 'Lollipop', 'Candy', 'Chocolate', 'Cupcake', 'Donut', 'Diamond', 'Ace', 'King', 'Queen', 'Star'],
    themeColor: '#e879a8',
    bgGradient: ['#1a0a14', '#3d1a2e'],
  },
  CrazyParty: {
    displayName: 'Crazy Party',
    symbols: ['🎉', '🎈', '🎁', '🎂', '🍾', '🎊', '💎', 'A', 'K', 'Q', '⭐'],
    symbolNames: ['Party', 'Balloon', 'Gift', 'Cake', 'Champagne', 'Confetti', 'Diamond', 'Ace', 'King', 'Queen', 'Star'],
    themeColor: '#f472b6',
    bgGradient: ['#1a0a1e', '#3d1a42'],
  },
  EmperorsChina: {
    displayName: "Emperor's China",
    symbols: ['🐉', '👑', '🏯', '🎎', '🧧', '💎', '🔔', 'A', 'K', 'Q', '⭐'],
    symbolNames: ['Dragon', 'Crown', 'Palace', 'Doll', 'Envelope', 'Diamond', 'Bell', 'Ace', 'King', 'Queen', 'Star'],
    themeColor: '#dc2626',
    bgGradient: ['#1a0505', '#3d0e0e'],
  },
  Geisha: {
    displayName: 'Geisha',
    symbols: ['👘', '🌸', '⛩️', '🎏', '🍵', '💎', '🔔', 'A', 'K', 'Q', '⭐'],
    symbolNames: ['Kimono', 'Sakura', 'Shrine', 'Koi', 'Tea', 'Diamond', 'Bell', 'Ace', 'King', 'Queen', 'Star'],
    themeColor: '#e11d48',
    bgGradient: ['#1a0510', '#3d0e24'],
  },
  LuckyGirls: {
    displayName: 'Lucky Girls',
    symbols: ['👧', '🍀', '💋', '👠', '💄', '💎', '🔔', 'A', 'K', 'Q', '⭐'],
    symbolNames: ['Girl', 'Clover', 'Kiss', 'Shoe', 'Lipstick', 'Diamond', 'Bell', 'Ace', 'King', 'Queen', 'Star'],
    themeColor: '#ec4899',
    bgGradient: ['#1a0a14', '#3d1a2e'],
  },
  MagicPrincess: {
    displayName: 'Magic Princess',
    symbols: ['👸', '🦄', '🏰', '💎', '🌹', '🔮', '🔔', 'A', 'K', 'Q', '⭐'],
    symbolNames: ['Princess', 'Unicorn', 'Castle', 'Diamond', 'Rose', 'Magic', 'Bell', 'Ace', 'King', 'Queen', 'Star'],
    themeColor: '#c026d3',
    bgGradient: ['#1a0520', '#3d1242'],
  },
  SunWukongPT: {
    displayName: 'Sun Wukong',
    symbols: ['🐒', '🏔️', '☁️', '🍑', '📜', '💎', '🔔', 'A', 'K', 'Q', '⭐'],
    symbolNames: ['Monkey', 'Mountain', 'Cloud', 'Peach', 'Scroll', 'Diamond', 'Bell', 'Ace', 'King', 'Queen', 'Star'],
    themeColor: '#ea580c',
    bgGradient: ['#1a0a00', '#3d2200'],
  },
  TweetyHouse: {
    displayName: 'Tweety House',
    symbols: ['🐦', '🐱', '🏠', '🌻', '🌈', '💎', '🔔', 'A', 'K', 'Q', '⭐'],
    symbolNames: ['Bird', 'Cat', 'House', 'Flower', 'Rainbow', 'Diamond', 'Bell', 'Ace', 'King', 'Queen', 'Star'],
    themeColor: '#facc15',
    bgGradient: ['#1a1400', '#3d2e00'],
  },
  WildDragonAM: {
    displayName: 'Wild Dragon',
    symbols: ['🐲', '🔥', '⚔️', '🛡️', '💰', '💎', '🔔', 'A', 'K', 'Q', '⭐'],
    symbolNames: ['Dragon', 'Fire', 'Sword', 'Shield', 'Gold', 'Diamond', 'Bell', 'Ace', 'King', 'Queen', 'Star'],
    themeColor: '#16a34a',
    bgGradient: ['#0a1a0e', '#1a3d22'],
  },
};

function getGameConfig(gameId: string, balance: number): SlotGameConfig {
  const theme = GAME_THEMES[gameId] || {};
  const defaults: SlotGameConfig = {
    gameId,
    displayName: theme.displayName || gameId,
    balance,
    symbols: theme.symbols || ['💎', '🔔', '🍒', '🍋', '🍊', '🍇', '7️⃣', 'A', 'K', 'Q', '⭐'],
    symbolNames: theme.symbolNames || ['Diamond', 'Bell', 'Cherry', 'Lemon', 'Orange', 'Grape', 'Seven', 'Ace', 'King', 'Queen', 'Star'],
    reelCount: theme.reelCount || 5,
    rowCount: theme.rowCount || 3,
    bets: [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000],
    paytable: {},
    wildSymbol: 0,
    scatterSymbol: (theme.symbols || []).length - 1,
    themeColor: theme.themeColor || '#06b6d4',
    bgGradient: theme.bgGradient || ['#0f172a', '#1e293b'],
  };
  return defaults;
}

// ===== HTML GENERATOR =====

export function generateSlotHTML(gameId: string, balance: number): string {
  const config = getGameConfig(gameId, balance);
  const symbolsJSON = JSON.stringify(config.symbols);
  const symbolNamesJSON = JSON.stringify(config.symbolNames);

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${config.displayName}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; user-select:none; }
html,body { width:100%; height:100%; overflow:hidden; font-family:-apple-system,system-ui,sans-serif; }
body {
  background: linear-gradient(180deg, ${config.bgGradient[0]}, ${config.bgGradient[1]});
  color: #fff;
  display: flex; flex-direction: column;
}

/* Header */
.header {
  display:flex; justify-content:space-between; align-items:center;
  padding: 8px 12px; background: rgba(0,0,0,0.4);
}
.game-title { font-size:14px; font-weight:800; color:${config.themeColor}; }
.balance-display { font-size:13px; font-weight:700; color:#fbbf24; }
.balance-display span { font-size:10px; color:#94a3b8; }

/* Reels */
.reels-frame {
  flex:1; display:flex; justify-content:center; align-items:center;
  padding: 8px;
}
.reels-container {
  display:flex; gap:4px;
  background: rgba(0,0,0,0.5);
  border: 2px solid ${config.themeColor}44;
  border-radius: 16px;
  padding: 8px;
  box-shadow: 0 0 30px ${config.themeColor}22;
  max-width: 100%;
}
.reel {
  display:flex; flex-direction:column; gap:2px;
  background: rgba(0,0,0,0.3);
  border-radius: 10px;
  overflow:hidden;
  width: ${Math.floor(90 / config.reelCount)}vw;
  max-width: 72px;
}
.cell {
  aspect-ratio:1;
  display:flex; justify-content:center; align-items:center;
  font-size:clamp(22px, 6vw, 36px);
  background: rgba(255,255,255,0.03);
  border-radius:8px;
  transition: transform 0.1s, background 0.3s;
  position:relative;
}
.cell.spinning {
  animation: slotSpin 0.1s linear infinite;
}
.cell.win {
  background: ${config.themeColor}33;
  animation: winPulse 0.5s ease infinite;
  border: 1px solid ${config.themeColor}88;
}
@keyframes slotSpin {
  0% { transform: translateY(-10%); opacity:0.6; }
  50% { transform: translateY(0); opacity:1; }
  100% { transform: translateY(10%); opacity:0.6; }
}
@keyframes winPulse {
  0%,100% { transform:scale(1); }
  50% { transform:scale(1.08); }
}

/* Win overlay */
.win-overlay {
  display:none; position:fixed; top:0;left:0;right:0;bottom:0;
  background:rgba(0,0,0,0.7); z-index:100;
  justify-content:center; align-items:center; flex-direction:column;
}
.win-overlay.show { display:flex; animation: fadeIn 0.3s; }
.win-amount {
  font-size:48px; font-weight:900; color:${config.themeColor};
  text-shadow: 0 0 20px ${config.themeColor}88;
  animation: winBounce 0.6s ease;
}
.win-label { font-size:16px; color:#fbbf24; margin-top:8px; font-weight:700; }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes winBounce { 0%{transform:scale(0.3);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }

/* Controls */
.controls {
  padding: 8px 12px 12px;
  background: rgba(0,0,0,0.5);
}
.controls-row {
  display:flex; gap:8px; align-items:center; justify-content:center;
}
.bet-section {
  display:flex; align-items:center; gap:6px;
}
.bet-label { font-size:10px; color:#94a3b8; font-weight:600; }
.bet-value { font-size:16px; font-weight:800; color:#fff; min-width:50px; text-align:center; }
.btn {
  border:none; border-radius:12px; font-weight:700; cursor:pointer;
  display:flex; justify-content:center; align-items:center;
  -webkit-tap-highlight-color:transparent;
}
.btn-bet {
  width:36px; height:36px; font-size:18px;
  background:rgba(255,255,255,0.1); color:#fff;
  border: 1px solid rgba(255,255,255,0.15);
}
.btn-bet:active { background:rgba(255,255,255,0.2); }
.btn-spin {
  width:64px; height:64px; border-radius:50%;
  font-size:13px; color:#fff; letter-spacing:0.5px;
  background: linear-gradient(135deg, ${config.themeColor}, ${config.themeColor}cc);
  box-shadow: 0 4px 20px ${config.themeColor}44;
  border: 2px solid ${config.themeColor}88;
}
.btn-spin:active { transform:scale(0.95); }
.btn-spin:disabled { opacity:0.5; }
.btn-auto {
  padding: 8px 14px; font-size:11px;
  background:rgba(255,255,255,0.08); color:#94a3b8;
  border: 1px solid rgba(255,255,255,0.1);
}
.btn-auto.active { background:${config.themeColor}22; color:${config.themeColor}; border-color:${config.themeColor}44; }
.btn-home {
  padding: 8px 14px; font-size:11px;
  background:rgba(239,68,68,0.15); color:#ef4444;
  border: 1px solid rgba(239,68,68,0.25);
}
.btn-home:active { background:rgba(239,68,68,0.3); }

/* Info bar */
.info-bar {
  display:flex; justify-content:space-between; align-items:center;
  padding: 4px 0; margin-bottom:6px;
}
.info-item { font-size:11px; color:#64748b; }
.info-item span { color:#94a3b8; font-weight:700; }
.win-display { color:${config.themeColor}; font-weight:800; font-size:14px; }

/* Paylines indicator */
.payline-info {
  display:flex; gap:4px; justify-content:center; margin-top:6px;
}
.payline-dot {
  width:6px;height:6px;border-radius:3px;
  background:rgba(255,255,255,0.15);
}
.payline-dot.active { background:${config.themeColor}; }
</style>
</head>
<body>

<div class="header">
  <div class="game-title">${config.displayName}</div>
  <div class="balance-display"><span>Saldo </span>Rp <span id="balanceText">${balance.toLocaleString('id-ID')}</span></div>
</div>

<div class="reels-frame">
  <div class="reels-container" id="reelsContainer"></div>
</div>

<div class="win-overlay" id="winOverlay" onclick="this.classList.remove('show')">
  <div class="win-amount" id="winAmount"></div>
  <div class="win-label" id="winLabel"></div>
</div>

<div class="controls">
  <div class="info-bar">
    <div class="info-item">Bet: <span id="betDisplay">Rp ${config.bets[3]?.toLocaleString('id-ID') || '100'}</span></div>
    <div class="win-display" id="winDisplay"></div>
    <div class="info-item">Lines: <span>${config.reelCount >= 5 ? '20' : '5'}</span></div>
  </div>
  <div class="controls-row">
    <button class="btn btn-home" onclick="exitGame()">🏠</button>
    <button class="btn btn-bet" id="betDown" onclick="changeBet(-1)">−</button>
    <div class="bet-section">
      <div class="bet-value" id="betValue">${config.bets[3] || 100}</div>
    </div>
    <button class="btn btn-bet" id="betUp" onclick="changeBet(1)">+</button>
    <button class="btn btn-spin" id="spinBtn" onclick="spin()">SPIN</button>
    <button class="btn btn-auto" id="autoBtn" onclick="toggleAuto()">AUTO</button>
  </div>
</div>

<script>
// ===== GAME STATE =====
const SYMBOLS = ${symbolsJSON};
const SYMBOL_NAMES = ${symbolNamesJSON};
const REEL_COUNT = ${config.reelCount};
const ROW_COUNT = ${config.rowCount};
const BETS = ${JSON.stringify(config.bets)};
const WILD_IDX = ${config.wildSymbol || 0};
const SCATTER_IDX = ${config.scatterSymbol ?? (config.symbols.length - 1)};

let balance = ${balance};
let currentBetIdx = 3; // default Rp 100
let spinning = false;
let autoSpin = false;
let grid = []; // [reel][row] = symbolIndex
let totalWinThisSpin = 0;

// Paytable: index -> [match3x, match4x, match5x] multipliers
// Lower index = higher value
const PAY_MULT = {};
for (let i = 0; i < SYMBOLS.length; i++) {
  if (i === SCATTER_IDX) {
    PAY_MULT[i] = [0, 0, 0]; // scatter pays separately
  } else if (i === 0) {
    PAY_MULT[i] = [5, 15, 50]; // premium 1
  } else if (i === 1) {
    PAY_MULT[i] = [4, 12, 40]; // premium 2
  } else if (i === 2) {
    PAY_MULT[i] = [3, 10, 30]; // premium 3
  } else if (i <= 4) {
    PAY_MULT[i] = [2, 6, 20]; // mid
  } else if (i <= 6) {
    PAY_MULT[i] = [1, 4, 12]; // low-mid
  } else {
    PAY_MULT[i] = [0.5, 2, 8]; // low (letters)
  }
}

// Paylines (20 lines for 5 reels, 5 for 3 reels)
const PAYLINES_5 = [
  [1,1,1,1,1], [0,0,0,0,0], [2,2,2,2,2],
  [0,1,2,1,0], [2,1,0,1,2],
  [0,0,1,2,2], [2,2,1,0,0],
  [1,0,0,0,1], [1,2,2,2,1],
  [0,1,0,1,0], [2,1,2,1,2],
  [1,0,1,0,1], [1,2,1,2,1],
  [0,1,1,1,0], [2,1,1,1,2],
  [0,2,0,2,0], [2,0,2,0,2],
  [1,0,1,2,1], [1,2,1,0,1],
  [0,2,2,2,0],
];
const PAYLINES_3 = [
  [1,1,1], [0,0,0], [2,2,2], [0,1,2], [2,1,0],
];
const PAYLINES = REEL_COUNT >= 5 ? PAYLINES_5 : PAYLINES_3;

// Symbol weights (lower index = rarer)
function getSymbolWeights() {
  const w = [];
  for (let i = 0; i < SYMBOLS.length; i++) {
    if (i === SCATTER_IDX) w.push(2);
    else if (i === WILD_IDX) w.push(3);
    else if (i <= 1) w.push(5);
    else if (i <= 3) w.push(8);
    else if (i <= 5) w.push(12);
    else w.push(16);
  }
  return w;
}

function weightedRandom() {
  const weights = getSymbolWeights();
  const total = weights.reduce((a,b) => a+b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

// ===== DOM =====
const reelsContainer = document.getElementById('reelsContainer');
const balanceText = document.getElementById('balanceText');
const betDisplay = document.getElementById('betDisplay');
const betValue = document.getElementById('betValue');
const spinBtn = document.getElementById('spinBtn');
const autoBtn = document.getElementById('autoBtn');
const winDisplay = document.getElementById('winDisplay');
const winOverlay = document.getElementById('winOverlay');
const winAmount = document.getElementById('winAmount');
const winLabel = document.getElementById('winLabel');

// Build reels DOM
const reelElements = [];
function buildReels() {
  reelsContainer.innerHTML = '';
  reelElements.length = 0;
  grid = [];
  for (let r = 0; r < REEL_COUNT; r++) {
    const reelDiv = document.createElement('div');
    reelDiv.className = 'reel';
    const cells = [];
    const reelGrid = [];
    for (let row = 0; row < ROW_COUNT; row++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const idx = weightedRandom();
      cell.textContent = SYMBOLS[idx];
      cell.dataset.sym = idx;
      reelDiv.appendChild(cell);
      cells.push(cell);
      reelGrid.push(idx);
    }
    reelsContainer.appendChild(reelDiv);
    reelElements.push(cells);
    grid.push(reelGrid);
  }
}

// ===== GAME LOGIC =====

function updateBalance(val) {
  balance = Math.max(0, val);
  balanceText.textContent = balance.toLocaleString('id-ID');
  // Notify React Native
  try {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'balance_update', balance: balance })
    );
  } catch(e) {}
}

function formatBet(val) {
  if (val >= 1000000) return (val/1000000) + 'JT';
  if (val >= 1000) return (val/1000) + 'RB';
  return val.toString();
}

function changeBet(dir) {
  if (spinning) return;
  currentBetIdx = Math.max(0, Math.min(BETS.length - 1, currentBetIdx + dir));
  const bet = BETS[currentBetIdx];
  betValue.textContent = formatBet(bet);
  betDisplay.textContent = 'Rp ' + bet.toLocaleString('id-ID');
}

function getBet() { return BETS[currentBetIdx]; }

async function spin() {
  if (spinning) return;
  const bet = getBet();
  if (balance < bet) {
    showMsg('Saldo tidak cukup!');
    autoSpin = false;
    autoBtn.classList.remove('active');
    return;
  }

  spinning = true;
  spinBtn.disabled = true;
  totalWinThisSpin = 0;
  winDisplay.textContent = '';

  // Deduct bet
  updateBalance(balance - bet);

  // Clear win highlights
  reelElements.forEach(cells => cells.forEach(c => c.classList.remove('win')));

  // Spin animation
  const spinDuration = 150; // ms per reel
  const totalDuration = REEL_COUNT * spinDuration + 600;

  // Start spinning all reels
  reelElements.forEach(cells => cells.forEach(c => c.classList.add('spinning')));

  // Stop reels one by one
  for (let r = 0; r < REEL_COUNT; r++) {
    await delay(spinDuration + Math.random() * 100);
    // Generate final symbols for this reel
    for (let row = 0; row < ROW_COUNT; row++) {
      const idx = weightedRandom();
      grid[r][row] = idx;
      reelElements[r][row].textContent = SYMBOLS[idx];
      reelElements[r][row].dataset.sym = idx;
      reelElements[r][row].classList.remove('spinning');
    }
  }

  await delay(200);

  // Check wins
  const winResult = checkWins(bet);
  totalWinThisSpin = winResult.totalWin;

  if (totalWinThisSpin > 0) {
    // Highlight winning cells
    winResult.winCells.forEach(([r, row]) => {
      reelElements[r][row].classList.add('win');
    });

    updateBalance(balance + totalWinThisSpin);
    winDisplay.textContent = '+Rp ' + totalWinThisSpin.toLocaleString('id-ID');

    // Big win overlay
    if (totalWinThisSpin >= bet * 10) {
      winAmount.textContent = 'Rp ' + totalWinThisSpin.toLocaleString('id-ID');
      winLabel.textContent = totalWinThisSpin >= bet * 50 ? '🎉 MEGA WIN!' : totalWinThisSpin >= bet * 20 ? '🔥 BIG WIN!' : '✨ GREAT WIN!';
      winOverlay.classList.add('show');
      await delay(2000);
      winOverlay.classList.remove('show');
    }
  }

  spinning = false;
  spinBtn.disabled = false;

  // Auto spin
  if (autoSpin && balance >= getBet()) {
    await delay(500);
    spin();
  } else {
    autoSpin = false;
    autoBtn.classList.remove('active');
  }
}

function checkWins(bet) {
  let totalWin = 0;
  const winCells = new Set();

  // Check each payline
  for (const line of PAYLINES) {
    const symbols = line.map((row, r) => grid[r][row]);

    // Determine the "paying" symbol (skip wilds to find the real symbol)
    let paySymbol = -1;
    for (let i = 0; i < symbols.length; i++) {
      if (symbols[i] !== WILD_IDX && symbols[i] !== SCATTER_IDX) {
        paySymbol = symbols[i];
        break;
      }
    }
    // If all wilds, pay as the best symbol
    if (paySymbol === -1) paySymbol = WILD_IDX;

    // Count consecutive matches from left
    let matchCount = 0;
    for (let i = 0; i < symbols.length; i++) {
      if (symbols[i] === paySymbol || symbols[i] === WILD_IDX) {
        matchCount++;
      } else break;
    }

    // Minimum 3 matches (for both 3-reel and 5-reel games)
    if (matchCount >= 3 && paySymbol !== SCATTER_IDX) {
      const mult = PAY_MULT[paySymbol] || [0.5, 2, 8];
      const payIdx = Math.min(matchCount - 3, mult.length - 1);
      const winMult = mult[payIdx];
      const lineWin = Math.round(bet * winMult);
      if (lineWin > 0) {
        totalWin += lineWin;
        for (let i = 0; i < matchCount; i++) {
          winCells.add(JSON.stringify([i, line[i]]));
        }
      }
    }
  }

  // Check scatter wins (anywhere on reels)
  let scatterCount = 0;
  const scatterPositions = [];
  for (let r = 0; r < REEL_COUNT; r++) {
    for (let row = 0; row < ROW_COUNT; row++) {
      if (grid[r][row] === SCATTER_IDX) {
        scatterCount++;
        scatterPositions.push([r, row]);
      }
    }
  }
  const minScatter = REEL_COUNT >= 5 ? 3 : 3;
  if (scatterCount >= minScatter) {
    const scatterMult = scatterCount === 3 ? 5 : scatterCount === 4 ? 20 : 100;
    totalWin += Math.round(bet * scatterMult);
    scatterPositions.forEach(pos => winCells.add(JSON.stringify(pos)));
  }

  return {
    totalWin,
    winCells: [...winCells].map(s => JSON.parse(s)),
  };
}

function toggleAuto() {
  autoSpin = !autoSpin;
  autoBtn.classList.toggle('active');
  if (autoSpin && !spinning) spin();
}

function exitGame() {
  autoSpin = false;
  try {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'exit_game', balance: balance })
    );
  } catch(e) {}
}

function showMsg(msg) {
  winDisplay.textContent = msg;
  setTimeout(() => { if (winDisplay.textContent === msg) winDisplay.textContent = ''; }, 2000);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ===== INIT =====
buildReels();
changeBet(0); // set display

// Notify bridge ready
try {
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
    JSON.stringify({ type: 'bridge_ready' })
  );
} catch(e) {}
</script>
</body>
</html>`;
}
