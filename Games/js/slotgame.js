
(function start() {
    new Phaser.Game({
        type: Phaser.AUTO,
        width: 1920,
        height: 1080,
        scene: {
            preload: preload,
            create: create
        }
    });

    let _this = undefined;
    let _spinCtr = 0;

    const _reels = [];
    const _reelsCount = 3;
    const _reelStartPosition = { x: 580, y: 500 };
    const _reelsDuration = [1000, 1500, 2000];
    const _symbolKeys = ["banana", "blackberry", "cherry"];

    const _reelStrips1 = [
        [_symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[2], _symbolKeys[1], _symbolKeys[1], _symbolKeys[1], _symbolKeys[1], _symbolKeys[2], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[0]],
        [_symbolKeys[1], _symbolKeys[2], _symbolKeys[1], _symbolKeys[2], _symbolKeys[0], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[0], _symbolKeys[2], _symbolKeys[0], _symbolKeys[1]],
        [_symbolKeys[2], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[0], _symbolKeys[1], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[0], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2]]
    ];

    const _reelStrips2 = [
        [_symbolKeys[1], _symbolKeys[1], _symbolKeys[2], _symbolKeys[1], _symbolKeys[1], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[2], _symbolKeys[1], _symbolKeys[2], _symbolKeys[1]],
        [_symbolKeys[1], _symbolKeys[2], _symbolKeys[1], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[1], _symbolKeys[1], _symbolKeys[2], _symbolKeys[2], _symbolKeys[2], _symbolKeys[0], _symbolKeys[1]],
        [_symbolKeys[2], _symbolKeys[0], _symbolKeys[1], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2]]
    ];

    const _reelStrips3 = [
        [_symbolKeys[2], _symbolKeys[1], _symbolKeys[2], _symbolKeys[0], _symbolKeys[1], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[1], _symbolKeys[1], _symbolKeys[2], _symbolKeys[2]],
        [_symbolKeys[1], _symbolKeys[2], _symbolKeys[1], _symbolKeys[0], _symbolKeys[0], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[1], _symbolKeys[2], _symbolKeys[0], _symbolKeys[1]],
        [_symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[0], _symbolKeys[0], _symbolKeys[1], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[1]]
    ];

    const _reelStrips4 = [
        [_symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[1], _symbolKeys[1], _symbolKeys[1], _symbolKeys[2], _symbolKeys[1], _symbolKeys[2], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[0]],
        [_symbolKeys[0], _symbolKeys[2], _symbolKeys[1], _symbolKeys[2], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[1], _symbolKeys[2], _symbolKeys[2], _symbolKeys[2], _symbolKeys[0], _symbolKeys[0]],
        [_symbolKeys[0], _symbolKeys[0], _symbolKeys[1], _symbolKeys[0], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[0], _symbolKeys[1], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[0]]
    ];

    const _reelStrips5 = [
        [_symbolKeys[1], _symbolKeys[1], _symbolKeys[2], _symbolKeys[2], _symbolKeys[1], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[1], _symbolKeys[1], _symbolKeys[2], _symbolKeys[1]],
        [_symbolKeys[1], _symbolKeys[2], _symbolKeys[1], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[0], _symbolKeys[2], _symbolKeys[0], _symbolKeys[1]],
        [_symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[2], _symbolKeys[0], _symbolKeys[1], _symbolKeys[0], _symbolKeys[0], _symbolKeys[1], _symbolKeys[1], _symbolKeys[0], _symbolKeys[1], _symbolKeys[1]]
    ];

    const _reelStrips = [_reelStrips1, _reelStrips2, _reelStrips3, _reelStrips4, _reelStrips5];
    
    function preload()
    {
        this.load.image("background", "assets/Background.png");
        this.load.image("spin", "assets/Spin.png");
        this.load.image("win", "assets/Win.png");
        this.load.image("banana", "assets/Banana.png");
        this.load.image("blackberry", "assets/Blackberry.png");
        this.load.image("cherry", "assets/Cherry.png");
        
        // preload cheat tool assets
        this.load.image("arrow", "assets/Arrow.png");
        this.load.image("ctBackground", "assets/CheatToolBackground.png");
        this.load.image("ctInput", "assets/CheatToolInput.png");
    }
    
    function create()
    {
        _this = this;

        // add background
        const background = this.add.sprite(0, 0, "background");
        background.setOrigin(0, 0);
    
        // add spin button
        this.spinButton = this.add.sprite(this.game.config.width / 2, 0, "spin").setInteractive({ cursor: "pointer" });
        this.spinButton.y = this.game.config.height - this.spinButton.height;
        addEventListener();
        
        // add symbols
        addSymbolsPerReel();

        // add win
        _this.win = _this.add.sprite(_this.game.config.width / 2, 0, "win");
        _this.win.y = _this.win.height + 100;
        showWinLabel(false);
    }

    function addEventListener()
    {
        _this.spinButton.on("pointerdown", () => {
            checkIfReelReachEnd();
            showWinLabel(false);

            _this.spinButton.setTint(0x808080);
            _this.spinButton.disableInteractive();
            startSpin();
        });
    }

    function checkIfReelReachEnd()
    {
        if (_spinCtr < 4) return;

        _spinCtr = 0;
        _reels.forEach((reel) => {
            reel.y = _reelStartPosition.y;
        });
    }
        
    function startSpin()
    {
        _reels.forEach((reel, index) => {
            _this.tweens.add({
                targets: reel,
                y: reel.y + 1050,
                ease: 'Linear',
                duration: _reelsDuration[index],
                onComplete: () => {
                    if (index === 2)
                    {
                        checkIfWin();
                        _this.spinButton.clearTint();
                        _this.spinButton.setInteractive({ cursor: 'pointer' });
                    }
                }
            });
        });
    }

    function checkIfWin()
    {
        _spinCtr++;

        const wins = [];
        _reels.forEach((reel) => {
            wins.push(reel.list[_spinCtr * 3].texture.key);
        });

        if (getWinResult(wins, 0) || getWinResult(wins, 1) || getWinResult(wins, 2))
        {
            showWinLabel(true);
        }
    }

    function getWinResult(wins, index)
    {
        const result = wins.every((win) => {
            return win === _symbolKeys[index];
        });

        return result;
    }

    function addSymbolsPerReel()
    {
        const reelParentContainer = _this.add.container(0, 0);
        const randomIdx = Math.floor(Math.random() * _reelStrips.length);
        const randomReelStrips = _reelStrips[randomIdx];
        for (let reelIdx = 0; reelIdx < _reelsCount; reelIdx++)
        {
            const reelContainer = _this.add.container(_reelStartPosition.x + reelIdx * 390, _reelStartPosition.y);
            for (let symbolIdx = 0; symbolIdx < randomReelStrips[reelIdx].length; symbolIdx++)
            {
                const symbol = _this.add.sprite(0, symbolIdx * -350, randomReelStrips[reelIdx][symbolIdx]);
                reelContainer.add(symbol);
            }
            _reels.push(reelContainer);
            reelParentContainer.add(reelContainer);
        }

        var maskImage = _this.make.image({
            x: _this.game.config.width / 2,
            y: _this.game.config.height / 2 - 20,
            key: 'mask',
            add: false
        });
        maskImage.setDisplaySize(1150, 450);

        var mask = new Phaser.Display.Masks.BitmapMask(_this, maskImage);
        reelParentContainer.mask = mask;
    }

    function showWinLabel(state)
    {
        _this.win.setVisible(state);
    }
})();