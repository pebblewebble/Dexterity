import { Injectable, Logger } from '@nestjs/common';
import { Player } from '../interfaces/player.interface';
import { GameState } from '../interfaces/game-state.interface';
import { AntEntity } from '../entities/ant.entity';
import { VultureEntity } from '../entities/vulture.entity';

@Injectable()
export class GameService {
  // Store all active games
  private games: Map<string, GameState> = new Map();
  private gameLoops: Map<string, NodeJS.Timeout> = new Map();

  // Game configuration
  private readonly TICK_RATE = 50; // ms between ticks
  private readonly ANT_SPAWN_RATE_INITIAL = 350; // ticks
  private readonly VULTURE_SPAWN_RATE_INITIAL = 2000; // ticks
  private readonly PLAYER_INITIAL_HEALTH = 15;

  // Initialize a new game
  initializeGame(roomId: string, players: Player[]): void {
    // Create game state
    const gameState: GameState = {
      roomId,
      players: players.reduce((acc, player) => {
        acc[player.id] = {
          ...player,
          health: this.PLAYER_INITIAL_HEALTH,
          score: 0,
          typing: {
            currentWord: '',
            activeAntId: null,
          },
          accuracy: {
            correct: 0,
            total: 0,
          }
        };
        return acc;
      }, {}),
      ants: [],
      vultures: [],
      gameTime: 0,
      antIdCounter: 0,
      vultureIdCounter: 0,
      vultureGroups: 0,
      currentVultureSequences: {},
      currentVultureGroups: {},
      difficulty: {
        level: 1,
        maxLevel: 5,
        levelStartTime: 0,
        timeBetweenLevels: [20000, 50000, 100000, 290000, 80000],
      },
      isGameOver: false,
      startTime: Date.now(),
      tickCounter: 0,
      antSpawnCounter: 0,
      vultureSpawnCounter: 0,
      nextVultureSpawnTime: 1500
    };

    // Store the game state
    this.games.set(roomId, gameState);

    console.log("Starting game loop.");

    // Start the game loop
    this.startGameLoop(roomId);
  }

  // Start the game loop for a specific room
  private startGameLoop(roomId: string): void {
    const gameLoop = setInterval(() => {
      this.gameTick(roomId);
    }, this.TICK_RATE);

    this.gameLoops.set(roomId, gameLoop);
  }

  // Stop the game loop for a specific room
  stopGame(roomId: string): void {
    const gameLoop = this.gameLoops.get(roomId);
    if (gameLoop) {
      clearInterval(gameLoop);
      this.gameLoops.delete(roomId);
    }

    this.games.delete(roomId);
  }

  // Game tick - update game state
  private gameTick(roomId: string): void {
    const gameState = this.games.get(roomId);
    if (!gameState || gameState.isGameOver) {
      return;
    }

    // Update game time
    gameState.gameTime += this.TICK_RATE;
    gameState.tickCounter++;

    // Update difficulty
    this.updateDifficulty(gameState);

    // Update all ants
    this.updateAnts(gameState);

    // Update all vultures
    this.updateVultures(gameState);

    // Spawn ants if needed
    if (gameState.tickCounter % this.getSpawnRate(gameState) === 0) {
      this.spawnAnt(gameState,"none");
    }

    // Spawn vultures if needed
    // gameState.vultureSpawnCounter++;
    // if (gameState.vultureSpawnCounter >= gameState.nextVultureSpawnTime) {
    //   this.spawnVultureGroup(gameState);
    //   gameState.vultureSpawnCounter = 0;

    //   // Calculate next spawn time based on difficulty
    //   const baseSpawnTime = 2000 - (gameState.difficulty.level * 200);
    //   const randomVariation = Math.floor(Math.random() * 500) - 250;
    //   gameState.nextVultureSpawnTime = Math.max(800, baseSpawnTime + randomVariation);
    // }
  }

  // Update game difficulty
  private updateDifficulty(gameState: GameState): void {
    const currentTime = Date.now();
    const timeInCurrentLevel = currentTime - gameState.difficulty.levelStartTime;

    // Only increase level if we haven't reached max difficulty
    if (gameState.difficulty.level < gameState.difficulty.maxLevel) {
      if (timeInCurrentLevel >= gameState.difficulty.timeBetweenLevels[gameState.difficulty.level - 1]) {
        // Increase difficulty level
        gameState.difficulty.level++;

        // Record the start time of this new level
        gameState.difficulty.levelStartTime = currentTime;
      }
    }
  }

  // Get current spawn rate based on difficulty
  private getSpawnRate(gameState: GameState): number {
    // Base spawn rates for each difficulty level (in ticks)
    const baseRates = [
      100,  
      50,  
      25,  
      10,   
      5    
    ];

    // Get the base rate for current level (array is 0-indexed)
    const baseRate = baseRates[gameState.difficulty.level - 1];

    // Calculate a gradual decrease within each level
    const ticksInCurrentLevel = (Date.now() - gameState.difficulty.levelStartTime) / 10;
    const scaleFactor = 0.0002;

    // Calculate current spawn rate
    const minimumRate = Math.max(15, baseRate - 10);
    const currentRate = Math.max(
      minimumRate,
      baseRate - Math.floor(ticksInCurrentLevel * scaleFactor)
    );

    return currentRate;
  }

  // Spawn a new ant
  private spawnAnt(gameState: GameState, direction: string): void {
    // Determine which side to spawn the ant on (alternating)
    var spawnFromLeft;
    if(direction==="none"){
      spawnFromLeft = gameState.antIdCounter % 2 === 0;
    }else if(direction==="left"){
      spawnFromLeft = true;
    }else{
      spawnFromLeft = false;
    }

    // Get a random word for this ant
    const word = this.getRandomWord(spawnFromLeft);

    // Create the ant entity
    const ant: AntEntity = {
      id: gameState.antIdCounter++,
      x: spawnFromLeft ? 0 : 600, // Assuming screen width is 600
      y: 0, // Will be positioned properly by the frontend
      word,
      isActive: false,
      remainingWord: word,
      typeDirection: spawnFromLeft ? 'left' : 'right', // Determines which player can type this ant
      direction: spawnFromLeft ? 1 : -1 // 1 = moving right, -1 = moving left
    };

    // Add to game state
    gameState.ants.push(ant);
  }

  // Spawn a group of vultures
  private spawnVultureGroup(gameState: GameState): void {
    // Determine starting number (either 1, 4, or 7)
    const startNumber = Math.floor(Math.random() * 3) * 3 + 1; // Will be 1, 4, or 7

    // Create three vultures with sequential numbers
    const positions = this.getRandomVulturePositions(3, 600); // Assuming screen width is 600

    for (let i = 0; i < 3; i++) {
      this.spawnVulture(gameState, positions[i].x, startNumber + i);
    }

    gameState.vultureGroups++;
  }

  // Spawn a single vulture
  private spawnVulture(gameState: GameState, xPosition: number, number: number): void {
    // Determine which player's side this vulture belongs to
    const isLeftSide = xPosition < 300; // Assuming middle of screen is at 300

    const vulture: VultureEntity = {
      id: gameState.vultureIdCounter++,
      x: xPosition,
      y: -30, // Start above the screen
      number,
      clicked: false,
      group: gameState.vultureGroups,
      side: isLeftSide ? 'left' : 'right' // Determines which player can click this vulture
    };

    gameState.vultures.push(vulture);
  }

  // Update all ants
  private updateAnts(gameState: GameState): void {
    const antsToRemove: number[] = [];

    for (let i = 0; i < gameState.ants.length; i++) {
      const ant = gameState.ants[i];

      // Move ants - speed increases with difficulty level
      const antSpeed = 1.25 * (1 + (gameState.difficulty.level - 1) * 0.2);
      ant.x += ant.direction * antSpeed;

      // Check if ants have reached a player
      if (ant.typeDirection === 'left' && ant.x > 250) { // Left player gets damaged
        // Find the left player
        const leftPlayer = Object.values(gameState.players).find(p => p.position === 'left');
        if (leftPlayer) {
          this.playerTakeDamage(gameState, leftPlayer.id);
        }
        antsToRemove.push(i);
      } else if (ant.typeDirection === 'right' && ant.x < 350) { // Right player gets damaged
        // Find the right player
        const rightPlayer = Object.values(gameState.players).find(p => p.position === 'right');
        if (rightPlayer) {
          this.playerTakeDamage(gameState, rightPlayer.id);
        }
        antsToRemove.push(i);
      }
    }

    // Remove ants in reverse order
    for (let i = antsToRemove.length - 1; i >= 0; i--) {
      const index = antsToRemove[i];

      // Check if any player was typing this ant
      for (const playerId in gameState.players) {
        const player = gameState.players[playerId];
        if (player.typing.activeAntId === gameState.ants[index].id) {
          player.typing.activeAntId = null;
          player.typing.currentWord = '';
        }
      }

      // Remove the ant
      gameState.ants.splice(index, 1);
    }
  }

  // Update all vultures
  private updateVultures(gameState: GameState): void {
    const vultureMovementSpeed = 0.03 * (1 + (gameState.difficulty.level - 1) * 0.1);

    const vulturesToRemove: number[] = [];

    for (let i = 0; i < gameState.vultures.length; i++) {
      const vulture = gameState.vultures[i];

      // Move down
      vulture.y += vultureMovementSpeed;

      // If vulture reaches the bottom, deal damage to corresponding player
      if (vulture.y > 380) { // Assuming player Y position is around 400
        const playerId = Object.values(gameState.players).find(p => p.position === vulture.side)?.id;
        if (playerId) {
          this.playerTakeDamage(gameState, playerId);
        }
        vulturesToRemove.push(i);
      }
    }

    // Remove vultures that have reached the bottom
    for (let i = vulturesToRemove.length - 1; i >= 0; i--) {
      gameState.vultures.splice(vulturesToRemove[i], 1);
    }
  }

  // Apply damage to a player
  private playerTakeDamage(gameState: GameState, playerId: string): void {
    const player = gameState.players[playerId];
    if (!player) return;

    player.health--;

    // Check for game over
    if (player.health <= 0) {
      player.health = 0; // Ensure health doesn't go negative
      gameState.isGameOver = true;
    }
  }

  // Handle a key press from a player
  handleKeyPress(roomId: string, player: Player, key: string): any {
    const gameState = this.games.get(roomId);
    if (!gameState || gameState.isGameOver) {
      return null;
    }

    const fullPlayer = gameState.players[player.id];
    if (!fullPlayer) return null;

    if(key === '1' && fullPlayer.score>=100){
      if(fullPlayer.position=="left"){
        this.spawnAnt(gameState,"right");
      }else{
        this.spawnAnt(gameState,"left");
      }
      fullPlayer.score=fullPlayer.score-100;
      return null;
    }

    // Ignore special keys like arrows, shift, etc.
    if (key.length !== 1 && key !== 'Backspace') {
      return null;
    }

    // Check if player is already typing a word
    if (fullPlayer.typing.activeAntId === null) {
      // Player is starting a new word
      // Find the closest ant on the player's side that starts with the pressed key
      const playerSide = fullPlayer.position;
      const matchingAnts = gameState.ants
        .filter(ant =>
          ant.typeDirection === playerSide &&
          !ant.isActive &&
          ant.word.toLowerCase().startsWith(key.toLowerCase())
        )
        .sort((a, b) => {
          // Sort by distance from player
          const playerX = playerSide === 'left' ? 150 : 450; // Approximate player position
          return Math.abs(a.x - playerX) - Math.abs(b.x - playerX);
        });

      if (matchingAnts.length === 0) {
        // No matching ant found
        fullPlayer.accuracy.total++;
        return {
          correct: false,
          accuracy: fullPlayer.accuracy.total > 0
            ? Math.round((fullPlayer.accuracy.correct / fullPlayer.accuracy.total) * 100)
            : 100,
          feedback: key,
          feedbackColor: 0xFF0000
        };
      }

      // Start typing the closest matching ant
      const ant = matchingAnts[0];
      ant.isActive = true;
      ant.remainingWord = ant.word.substring(1);

      fullPlayer.typing.activeAntId = ant.id;
      fullPlayer.typing.currentWord = key;

      // Update accuracy
      fullPlayer.accuracy.correct++;
      fullPlayer.accuracy.total++;

      // Add points for starting a new word
      fullPlayer.score += 5;

      return {
        antId: ant.id,
        correct: true,
        remainingWord: ant.remainingWord,
        currentTypingWord: fullPlayer.typing.currentWord,
        score: fullPlayer.score,
        accuracy: fullPlayer.accuracy.total > 0
          ? Math.round((fullPlayer.accuracy.correct / fullPlayer.accuracy.total) * 100)
          : 100,
        feedback: key,
        feedbackColor: 0x00FF00
      };
    } else {
      // Player is continuing to type a word
      const ant = gameState.ants.find(a => a.id === fullPlayer.typing.activeAntId);
      if (!ant) {
        // Ant no longer exists
        fullPlayer.typing.activeAntId = null;
        fullPlayer.typing.currentWord = '';
        return null;
      }

      if (ant.remainingWord.toLowerCase().startsWith(key.toLowerCase())) {
        // Correct key pressed
        ant.remainingWord = ant.remainingWord.substring(1);
        fullPlayer.typing.currentWord += key;

        // Update accuracy
        fullPlayer.accuracy.correct++;
        fullPlayer.accuracy.total++;

        // Add points for each correct keystroke
        fullPlayer.score += 1;

        // Check if the word is complete
        if (ant.remainingWord.length === 0) {
          // Word complete, remove ant
          const index = gameState.ants.findIndex(a => a.id === ant.id);
          if (index !== -1) {
            gameState.ants.splice(index, 1);
          }

          // Bonus points for completing a word
          const wordCompletionBonus = Math.max(10, fullPlayer.typing.currentWord.length * 2);
          fullPlayer.score += wordCompletionBonus;

          // Reset typing state
          fullPlayer.typing.activeAntId = null;
          fullPlayer.typing.currentWord = '';

          return {
            antId: ant.id,
            completed: true,
            correct: true,
            score: fullPlayer.score,
            accuracy: fullPlayer.accuracy.total > 0
              ? Math.round((fullPlayer.accuracy.correct / fullPlayer.accuracy.total) * 100)
              : 100,
            feedback: '✓',
            feedbackColor: 0x00FF00,
            bonusPoints: wordCompletionBonus
          };
        }

        return {
          antId: ant.id,
          correct: true,
          remainingWord: ant.remainingWord,
          currentTypingWord: fullPlayer.typing.currentWord,
          score: fullPlayer.score,
          accuracy: fullPlayer.accuracy.total > 0
            ? Math.round((fullPlayer.accuracy.correct / fullPlayer.accuracy.total) * 100)
            : 100,
          feedback: key,
          feedbackColor: 0x00FF00
        };
      } else {
        // Incorrect key pressed
        fullPlayer.accuracy.total++;

        Logger.log(fullPlayer.accuracy.total, fullPlayer.accuracy.correct)

        return {
          antId: ant.id,
          correct: false,
          remainingWord: ant.remainingWord,
          currentTypingWord: fullPlayer.typing.currentWord,
          score: fullPlayer.score,
          accuracy: fullPlayer.accuracy.total > 0
            ? Math.round((fullPlayer.accuracy.correct / fullPlayer.accuracy.total) * 100)
            : 100,
          feedback: key,
          feedbackColor: 0xFF0000
        };
      }
    }
  }

  // Handle a vulture click from a player
  handleVultureClick(roomId: string, player: Player, vultureId: number): any {
    const gameState = this.games.get(roomId);
    if (!gameState || gameState.isGameOver) {
      return null;
    }

    const fullPlayer = gameState.players[player.id];
    if (!fullPlayer) return null;

    // Find the vulture
    const vultureIndex = gameState.vultures.findIndex(v => v.id === vultureId);
    if (vultureIndex === -1) return null;

    const vulture = gameState.vultures[vultureIndex];

    // Check if vulture is on player's side
    if (vulture.side !== fullPlayer.position) {
      return {
        correct: false,
        feedback: 'Wrong side!',
        feedbackColor: 0xFF0000
      };
    }

    // Skip if already clicked
    if (vulture.clicked) return null;

    // Check for the starting vulture in a sequence (1, 4, or 7)
    if ([1, 4, 7].includes(vulture.number) &&
      (!gameState.currentVultureSequences[fullPlayer.id] ||
        gameState.currentVultureSequences[fullPlayer.id] === -1)) {

      gameState.currentVultureSequences[fullPlayer.id] = vulture.number;
      gameState.currentVultureGroups[fullPlayer.id] = vulture.group;
      vulture.clicked = true;

      // Award points
      fullPlayer.score += 20;

      return {
        vultureId,
        correct: true,
        score: fullPlayer.score,
        feedback: '+20',
        feedbackColor: 0x00FF00
      };
    }

    // Check if this is the correct vulture in the sequence
    if (vulture.number === gameState.currentVultureSequences[fullPlayer.id] &&
      vulture.group === gameState.currentVultureGroups[fullPlayer.id]) {

      // Correct vulture clicked
      vulture.clicked = true;

      // Award points
      fullPlayer.score += 20;

      // Move to the next number in sequence
      gameState.currentVultureSequences[fullPlayer.id]++;

      // Check if we completed a set of vultures
      if ([4, 7, 10].includes(gameState.currentVultureSequences[fullPlayer.id])) {
        // Award bonus for completing in correct order
        fullPlayer.score += 30;

        // Remove clicked vultures on this player's side
        for (let i = gameState.vultures.length - 1; i >= 0; i--) {
          const v = gameState.vultures[i];
          if (v.side === fullPlayer.position && v.clicked) {
            gameState.vultures.splice(i, 1);
          }
        }

        // Reset sequence
        gameState.currentVultureSequences[fullPlayer.id] = -1;

        return {
          vultureId,
          sequenceComplete: true,
          correct: true,
          score: fullPlayer.score,
          bonusPoints: 30,
          feedback: 'Sequence Complete! +30',
          feedbackColor: 0xFFFF00
        };
      }

      return {
        vultureId,
        correct: true,
        score: fullPlayer.score,
        feedback: '+20',
        feedbackColor: 0x00FF00
      };
    } else {
      // Wrong vulture clicked
      fullPlayer.score = Math.max(0, fullPlayer.score - 10); // Ensure score doesn't go negative

      return {
        vultureId,
        correct: false,
        score: fullPlayer.score,
        feedback: 'Wrong order!',
        feedbackColor: 0xFF0000
      };
    }
  }

  // Get game state updates for a specific room
  getGameState(roomId: string): GameState | null {
    return this.games.get(roomId) || null;
  }

  // Utility function to get random positions for vultures
  private getRandomVulturePositions(count: number, screenWidth: number): { x: number }[] {
    const positions: { x: number }[] = [];
    const vultureWidth = 30;
    const usableWidth = screenWidth - vultureWidth;
    const sectionWidth = usableWidth / count;
    const margin = 20;

    for (let i = 0; i < count; i++) {
      const minX = i * sectionWidth + margin;
      const maxX = (i + 1) * sectionWidth - margin;
      const safeMinX = Math.max(0, minX);
      const safeMaxX = Math.min(screenWidth - vultureWidth, maxX);

      const x = safeMinX < safeMaxX
        ? safeMinX + Math.random() * (safeMaxX - safeMinX)
        : (screenWidth - vultureWidth) / (count + 1) * (i + 1);

      positions.push({ x });
    }

    // Shuffle the positions
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    return positions;
  }

  // Get a random word based on spawn side (left or right)
  private getRandomWord(spawnFromLeft: boolean): string {
    const wordCategories = {
      // Short words (3-4 letters)
      shortWords: [
        'ant', 'egg', 'dig', 'run', 'red', 'big', 'hot', 'wet', 'fast', 'tiny',
        'hill', 'nest', 'bit', 'bug', 'ram', 'cpu', 'net', 'key', 'tap', 'cut',
        'pin', 'log', 'sum', 'map', 'bat', 'bin', 'tag', 'car', 'cat', 'dog',
        'dot', 'ear', 'fan', 'gap', 'hen', 'ink', 'jar', 'kit', 'lip', 'mix',
        'nap', 'oak', 'pop', 'quit', 'raw', 'sad', 'tan', 'use', 'van', 'win'
      ],

      // Medium words (5-7 letters)
      mediumWords: [
        'colony', 'worker', 'tunnel', 'scent', 'swarm', 'brave', 'clever',
        'search', 'signal', 'forage', 'defend', 'focused', 'binary', 'server',
        'method', 'buffer', 'thread', 'script', 'hacker', 'module', 'python',
        'syntax', 'packet', 'memory', 'branch', 'syntax', 'object', 'pointer',
        'vector', 'entity', 'sprite', 'object', 'backup', 'socket', 'global',
        'static', 'random', 'kernel', 'output', 'system', 'program', 'source',
        'token', 'nested', 'linked', 'assign', 'toggle', 'branch', 'export'
      ],

      // Long words (8+ letters)
      longWords: [
        'organized', 'determined', 'courageous', 'resourceful', 'perseverance',
        'communication', 'coordination', 'navigation', 'pheromone', 'competition',
        'camouflage', 'algorithm', 'recursion', 'framework', 'interface',
        'encryption', 'debugging', 'networking', 'cybersecurity', 'compilation',
        'multithreading', 'optimization', 'parallelism', 'virtualization',
        'serialization', 'decomposition', 'inheritance', 'polymorphism',
        'asynchronous', 'synchronization', 'abstraction', 'serialization',
        'deserialization', 'normalization', 'computerized', 'computational',
        'subroutine', 'artificial', 'concurrency', 'transmission', 'hyperlinked',
        'cryptography', 'binarytree', 'hashfunction', 'backtracking', 'simulating',
        'mathematical', 'blockchains', 'cryptosystem'
      ],

      // Other categories as needed
    };

    // First, select a random category
    const categories = Object.keys(wordCategories);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];

    // Get all words from that category
    const words = wordCategories[randomCategory as keyof typeof wordCategories];

    // Filter words based on which side the ant is spawning from
    // Left side ants get words starting with a-m
    // Right side ants get words starting with n-z
    const filteredWords = words.filter(word => {
      const firstLetter = word.charAt(0).toLowerCase();
      if (spawnFromLeft) {
        return firstLetter <= 'm'; // First half of alphabet (a-m)
      } else {
        return firstLetter > 'm';  // Second half of alphabet (n-z)
      }
    });

    // If we don't have any words that match our criteria, try again
    if (filteredWords.length === 0) {
      return this.getRandomWord(spawnFromLeft);
    }

    // Return a random word from the filtered list
    return filteredWords[Math.floor(Math.random() * filteredWords.length)];
  }
}


