class WaterSortPuzzle {
    constructor() {
        this.tubes = [];
        this.selectedTube = null;
        this.moves = [];
        this.moveCount = 0;
        this.coinBalance = 800; // Initial welcome bonus
        this.timer = 120; // Timer set to 120 seconds
        this.colors = [
            '#FF3366', '#33CC33', '#3366FF', '#FF9933', 
            '#9933FF', '#33CCCC', '#FF3399', '#66CC33'
        ];
        this.level = 1;
        this.isAnimating = false;
        this.soundEnabled = true;
        this.setupGame();
        this.bindEvents();
        this.startTimer();
    }

    setupGame() {
        this.moves = [];
        this.moveCount = 0;
        this.updateMoveCount();
        document.getElementById('levelNumber').textContent = this.level;
        document.getElementById('coinBalance').textContent = this.coinBalance;
        this.resetTimer();
        
        const tubesContainer = document.querySelector('.tubes-container');
        tubesContainer.innerHTML = '';
        this.tubes = [];

        // Calculate number of colors and tubes
        const numColors = Math.min(3 + Math.floor(this.level / 2), 8);
        const numTubes = numColors + 2;

        // Create and shuffle colors
        const colors = this.colors.slice(0, numColors);
        let liquidSections = [];
        
        // Fill sections ensuring no gaps
        colors.forEach(color => {
            for (let i = 0; i < 4; i++) {
                liquidSections.push(color);
            }
        });

        // Shuffle sections
        for (let i = liquidSections.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [liquidSections[i], liquidSections[j]] = [liquidSections[j], liquidSections[i]];
        }

        // Create tubes
        for (let i = 0; i < numTubes; i++) {
            const tube = document.createElement('div');
            tube.className = 'tube';
            tube.dataset.index = i;
            tubesContainer.appendChild(tube);
            
            // Fill tubes without gaps
            if (i < numColors) {
                this.tubes.push(liquidSections.slice(i * 4, (i + 1) * 4));
            } else {
                this.tubes.push([]);
            }
            this.renderTube(i);
        }

        document.getElementById('undoMove').disabled = true;
        this.hideLevelComplete();
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.timer > 0) {
                this.timer--;
                document.getElementById('timer').textContent = this.timer;
            } else {
                clearInterval(this.timerInterval);
                alert('Time is up! Try again.');
                this.setupGame();
            }
        }, 1000);
    }

    resetTimer() {
        clearInterval(this.timerInterval);
        this.timer = 120;
        document.getElementById('timer').textContent = this.timer;
        this.startTimer();
    }

    bindEvents() {
        document.querySelector('.tubes-container').addEventListener('click', (e) => {
            const tube = e.target.closest('.tube');
            if (!tube) return;
            const index = parseInt(tube.dataset.index);
            this.handleTubeClick(index);
        });

        document.getElementById('menuButton').addEventListener('click', () => {
            document.getElementById('menuOverlay').classList.add('active');
        });

        document.getElementById('restartLevel').addEventListener('click', () => {
            document.getElementById('menuOverlay').classList.remove('active');
            this.setupGame();
        });

        document.getElementById('newGame').addEventListener('click', () => {
            document.getElementById('menuOverlay').classList.remove('active');
            this.level = 1;
            this.coinBalance = 800; // Reset coin balance on new game
            this.setupGame();
        });

        document.getElementById('soundToggle').addEventListener('click', (e) => {
            this.soundEnabled = !this.soundEnabled;
            e.target.innerHTML = `<i class="fas fa-volume-${this.soundEnabled ? 'up' : 'mute'}"></i> Sound: ${this.soundEnabled ? 'On' : 'Off'}`;
        });

        document.getElementById('undoMove').addEventListener('click', () => {
            this.undoMove();
        });

        document.getElementById('hint').addEventListener('click', () => {
            this.showHint();
        });

        document.getElementById('nextLevel').addEventListener('click', () => {
            this.level++;
            this.coinBalance += 30; // Add $30 for level completion
            this.setupGame();
        });

        document.getElementById('shufflePowerUp').addEventListener('click', () => {
            this.shuffleTubes();
        });

        document.getElementById('skipLevelPowerUp').addEventListener('click', () => {
            this.level++;
            this.setupGame();
        });

        // Close menu when clicking outside
        document.getElementById('menuOverlay').addEventListener('click', (e) => {
            if (e.target.id === 'menuOverlay') {
                e.target.classList.remove('active');
            }
        });
    }

    shuffleTubes() {
        const allSections = this.tubes.flat();
        for (let i = allSections.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allSections[i], allSections[j]] = [allSections[j], allSections[i]];
        }

        let index = 0;
        this.tubes.forEach(tube => {
            tube.length = 0;
            for (let i = 0; i < 4 && index < allSections.length; i++) {
                tube.push(allSections[index++]);
            }
        });

        this.tubes.forEach((_, i) => this.renderTube(i));
    }

    updateMoveCount() {
        document.getElementById('moveCount').textContent = this.moveCount;
        document.getElementById('finalMoves').textContent = this.moveCount;
        document.getElementById('undoMove').disabled = this.moves.length === 0;
    }

    async handleTubeClick(index) {
        if (this.isAnimating) return;

        const tube = document.querySelector(`.tube[data-index="${index}"]`);
        
        if (this.selectedTube === null) {
            if (this.tubes[index].length === 0) return;
            this.selectedTube = index;
            tube.classList.add('selected');
            this.playSound('select');
        } else {
            const previousTube = document.querySelector(`.tube[data-index="${this.selectedTube}"]`);
            previousTube.classList.remove('selected');

            if (this.selectedTube !== index && this.canPour(this.selectedTube, index)) {
                await this.pourLiquid(this.selectedTube, index);
                this.moveCount++;
                this.moves.push([this.selectedTube, index]);
                this.updateMoveCount();
                this.playSound('pour');
                
                if (this.checkWin()) {
                    this.handleWin();
                }
            } else {
                this.playSound('invalid');
            }
            this.selectedTube = null;
        }
    }

    canPour(fromIndex, toIndex) {
        const fromTube = this.tubes[fromIndex];
        const toTube = this.tubes[toIndex];
        
        if (fromTube.length === 0) return false;
        if (toTube.length >= 4) return false;
        
        const colorToPour = fromTube[fromTube.length - 1];
        return toTube.length === 0 || toTube[toTube.length - 1] === colorToPour;
    }

    async pourLiquid(fromIndex, toIndex) {
        if (this.isAnimating) return;
        this.isAnimating = true;

        const fromTube = this.tubes[fromIndex];
        const toTube = this.tubes[toIndex];
        const colorToPour = fromTube[fromTube.length - 1];

        // Get consecutive same-color sections from top
        let colorGroupLength = 1;
        for (let i = fromTube.length - 2; i >= 0; i--) {
            if (fromTube[i] === colorToPour) {
                colorGroupLength++;
            } else {
                break;
            }
        }

        // Calculate available space in target tube
        const spaceInTarget = 4 - toTube.length;
        const sectionsToTransfer = Math.min(colorGroupLength, spaceInTarget);

        // Transfer sections one by one without gaps
        for (let i = 0; i < sectionsToTransfer; i++) {
            const fromElement = document.querySelector(
                `.tube[data-index="${fromIndex}"] .liquid-section:last-child`
            );

            if (fromElement) {
                fromElement.classList.add('liquid-transferring');
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Remove from source
                fromTube.pop();
                this.renderTube(fromIndex);

                // Add to target
                toTube.push(colorToPour);
                this.renderTube(toIndex);

                // Add fill animation to new section
                const newSection = document.querySelector(
                    `.tube[data-index="${toIndex}"] .liquid-section:last-child`
                );
                if (newSection) {
                    newSection.classList.add('liquid-new');
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        }

        this.isAnimating = false;
    }

    renderTube(index) {
        const tube = document.querySelector(`.tube[data-index="${index}"]`);
        tube.innerHTML = '';
        
        // Render each liquid section without gaps
        this.tubes[index].forEach((color, i) => {
            const section = document.createElement('div');
            section.className = 'liquid-section';
            section.style.backgroundColor = color;
            section.style.bottom = `${i * 25}%`;
            section.style.zIndex = i;
            tube.appendChild(section);
        });
    }

    checkWin() {
        return this.tubes.every(tube => 
            tube.length === 0 || 
            (tube.length === 4 && tube.every(color => color === tube[0]))
        );
    }

    handleWin() {
        document.getElementById('levelComplete').classList.add('active');
        this.playSound('win');
    }

    hideLevelComplete() {
        document.getElementById('levelComplete').classList.remove('active');
    }

    undoMove() {
        if (this.moves.length === 0) return;
        
        const [fromIndex, toIndex] = this.moves.pop();
        const color = this.tubes[toIndex].pop();
        this.tubes[fromIndex].push(color);
        
        this.renderTube(fromIndex);
        this.renderTube(toIndex);
        
        this.moveCount--;
        this.updateMoveCount();
        this.playSound('undo');
    }

    showHint() {
        // Simple hint system - highlight tubes that can be poured into each other
        let found = false;
        for (let i = 0; i < this.tubes.length && !found; i++) {
            for (let j = 0; j < this.tubes.length; j++) {
                if (i !== j && this.canPour(i, j)) {
                    const tube1 = document.querySelector(`.tube[data-index="${i}"]`);
                    const tube2 = document.querySelector(`.tube[data-index="${j}"]`);
                    
                    tube1.style.boxShadow = '0 0 15px #50E3C2';
                    tube2.style.boxShadow = '0 0 15px #50E3C2';
                    
                    setTimeout(() => {
                        tube1.style.boxShadow = '';
                        tube2.style.boxShadow = '';
                    }, 1000);
                    
                    found = true;
                    break;
                }
            }
        }
        this.playSound('hint');
    }

    playSound(type) {
        if (!this.soundEnabled) return;
        
        const sounds = {
            select: 440,
            pour: 880,
            invalid: 220,
            win: [440, 554, 659],
            hint: [554, 440],
            undo: [440, 330]
        };

        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        if (Array.isArray(sounds[type])) {
            sounds[type].forEach((freq, i) => {
                setTimeout(() => {
                    this.playTone(ctx, freq, 0.1);
                }, i * 200);
            });
        } else {
            this.playTone(ctx, sounds[type], 0.1);
        }
    }

    playTone(ctx, frequency, duration) {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = frequency;
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new WaterSortPuzzle();
});
