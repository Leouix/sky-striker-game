BasicGame.Game = function (game) {

};

BasicGame.Game.prototype = {

    preload: function () {
        this.load.image('sea', 'assets/sea.png');
        this.load.image('bullet', 'assets/bullet.png');
        this.load.spritesheet('greenEnemy', 'assets/enemy.png', 32, 32);
        this.load.spritesheet('explosion', 'assets/explosion.png', 32, 32);
        this.load.spritesheet('player', 'assets/player.png', 64, 64);
    },

    create: function () {

        this.setupBackground();
        this.setupPlayer();
        this.setupEnemies();
        this.setupBullets();
        this.setupExplosions();
        this.setupText();

        this.cursors = this.input.keyboard.createCursorKeys();

    },

    setupBackground: function () {
        this.sea = this.add.tileSprite(0, 0, 800, 600, 'sea');
        this.sea.autoScroll(0, 12);
    },

    setupPlayer: function () {
        this.player = this.add.sprite(400, 550, 'player');
        this.player.anchor.setTo(0.5, 0.5);
        this.player.animations.add('fly', [0, 1, 2], 20, true);
        this.player.play('fly');
        this.physics.enable(this.player, Phaser.Physics.ARCADE);
        this.player.speed = 300;
        this.player.body.collideWorldBounds = true;
        // 20 x 20 pixel hitbox, centered a little bit higher than the center
        this.player.body.setSize(20, 20, 0, -5);
    },

    setupEnemies: function () {
        this.enemyPool = this.add.group();
        this.enemyPool.enableBody = true;
        this.enemyPool.physicsBodyType = Phaser.Physics.ARCADE;
        this.enemyPool.createMultiple(50, 'greenEnemy');
        this.enemyPool.setAll('anchor.x', 0.5);
        this.enemyPool.setAll('anchor.y', 0.5);
        this.enemyPool.setAll('outOfBoundsKill', true);
        this.enemyPool.setAll('checkWorldBounds', true);

        // Set the animation for each sprite
        this.enemyPool.forEach(function (enemy) {
            enemy.animations.add('fly', [0, 1, 2], 20, true);
        });

        this.nextEnemyAt = 0;
        this.enemyDelay = 100;
    },

    setupBullets: function () {
        // Add an empty sprite group into our game
        this.bulletPool = this.add.group();

        // Enable physics to the whole sprite group
        this.bulletPool.enableBody = true;
        this.bulletPool.physicsBodyType = Phaser.Physics.ARCADE;

        // Add 100 'bullet' sprites in the group.
        // By default this uses the first frame of the sprite sheet and
        //   sets the initial state as non-existing (i.e. killed/dead)
        this.bulletPool.createMultiple(100, 'bullet');

        // Sets anchors of all sprites
        this.bulletPool.setAll('anchor.x', 0.5);
        this.bulletPool.setAll('anchor.y', 0.5);

        // Automatically kill the bullet sprites when they go out of bounds
        this.bulletPool.setAll('outOfBoundsKill', true);
        this.bulletPool.setAll('checkWorldBounds', true);

        this.nextShotAt = 0;
        this.shotDelay = 100;
    },

    setupExplosions: function () {
        this.explosionPool = this.add.group();
        this.explosionPool.enableBody = true;
        this.explosionPool.physicsBodyType = Phaser.Physics.ARCADE;
        this.explosionPool.createMultiple(100, 'explosion');
        this.explosionPool.setAll('anchor.x', 0.5);
        this.explosionPool.setAll('anchor.y', 0.5);
        this.explosionPool.forEach(function (explosion) {
            explosion.animations.add('boom');
        });
    },

    update: function (event) {

        this.checkCollisions();
        this.spawnEnemies();
        this.processPlayerInput();
        this.processDelayedEffects();



    },

    checkCollisions: function () {
        this.physics.arcade.overlap(
            this.bulletPool, this.enemyPool, this.enemyHit, null, this
        );

        this.physics.arcade.overlap(
            this.player, this.enemyPool, this.playerHit, null, this
        );
    },

    spawnEnemies: function () {
        if (this.nextEnemyAt < this.time.now && this.enemyPool.countDead() > 0) {
            this.nextEnemyAt = this.time.now + this.enemyDelay;
            var enemy = this.enemyPool.getFirstExists(false);
            // spawn at a random location top of the screen
            enemy.reset(this.rnd.integerInRange(20, 780), 0);
            // also randomize the speed
            enemy.body.velocity.y = this.rnd.integerInRange(30, 60);
            enemy.play('fly');
        }
    },

    processPlayerInput: function () {
        this.player.body.velocity.x = 0;
        this.player.body.velocity.y = 0;

        if (this.cursors.left.isDown) {
            this.player.body.velocity.x = -this.player.speed;
        } else if (this.cursors.right.isDown) {
            this.player.body.velocity.x = this.player.speed;
        }

        if (this.cursors.up.isDown) {
            this.player.body.velocity.y = -this.player.speed;
        } else if (this.cursors.down.isDown) {
            this.player.body.velocity.y = this.player.speed;
        }

        if (this.input.activePointer.isDown &&
            this.physics.arcade.distanceToPointer(this.player) > 15) {
            this.physics.arcade.moveToPointer(this.player, this.player.speed);
        }

        if (this.input.keyboard.isDown(Phaser.Keyboard.S) ||
            this.input.activePointer.isDown) {
            this.fire();
        }

        if (this.input.keyboard.isDown(Phaser.Keyboard.A)  ||
            this.input.activePointer.isDown) {
            this.player.body.velocity.x = -this.player.speed;
        }

        if (this.input.keyboard.isDown(Phaser.Keyboard.D)  ||
            this.input.activePointer.isDown) {
            this.player.body.velocity.x = this.player.speed;
        }

        if (this.input.keyboard.isDown(Phaser.Keyboard.E) ) {
            if( this.score > BasicGame.SCORE_FOR_BOMB) {
                this.bombEnemies();
                this.score = parseInt(this.score) - parseInt(BasicGame.SCORE_FOR_BOMB);
                this.scoreText.text = this.score;
            }
        }
    },

    processDelayedEffects: function () {
        if (this.instructions.exists && this.time.now > this.instExpire) {
            this.instructions.destroy();
        }
    },

    render: function () {
        // this.game.debug.body(this.player);
    },

    fire: function () {

        if (!this.player.alive || this.nextShotAt > this.time.now) {
            return;
        }

        if (this.bulletPool.countDead() === 0) {
            return;
        }

        this.nextShotAt = this.time.now + this.shotDelay;

        // Find the first dead bullet in the pool
        var bullet = this.bulletPool.getFirstExists(false);
        // Reset (revive) the sprite and place it in a new location
        bullet.reset(this.player.x, this.player.y - 15);

        bullet.body.velocity.y = -500;


    },

    enemyHit: function (bullet, enemy) {
        bullet.kill();
        this.damageEnemy(enemy, BasicGame.BULLET_DAMAGE);

    },

    playerHit: function (player, enemy) {
        this.explode(enemy);
        enemy.kill();
        this.explode(player);
        player.kill();
    },

    explode: function (sprite) {
        if (this.explosionPool.countDead() === 0) {
            return;
        }
        var explosion = this.explosionPool.getFirstExists(false);
        explosion.reset(sprite.x, sprite.y);
        explosion.play('boom', 15, false, true);
        // add the original sprite's velocity to the explosion
        explosion.body.velocity.x = sprite.body.velocity.x;
        explosion.body.velocity.y = sprite.body.velocity.y;
    },

    damageEnemy: function (enemy, damage) {
        enemy.damage(damage);
        if (enemy.alive) {
            enemy.play('hit');
        } else {
            this.explode(enemy);
            this.addToScore(BasicGame.DAMAGE_DEFAULT);

        }
    },

    setupText: function () {

        this.score = 0;
        this.scoreText = this.add.text(
            this.game.width / 2, 30, '' + this.score,
            {font: '20px monospace', fill: '#fff', align: 'center'}
        );
        this.scoreText.anchor.setTo(0.5, 0.5);

        let viewed = this.getCookie('viewed');

        if ( viewed > 2 ) {
            this.instructions = true;
            return;
        }

        this.instructions = this.add.text(
            this.game.width / 2,
            this.game.height - 100,
            'Use Arrow Keys to Move, Press F to Fire\n' +
            'Tapping/clicking does both',
            {font: '20px monospace', fill: '#fff', align: 'center'}
        );
        this.instructions.anchor.setTo(0.5, 0.5);
        this.instExpire = this.time.now + BasicGame.INSTRUCTION_EXPIRE;

        if( !viewed ) {
            this.setCookie('viewed', 1, 3);
        } else {
            viewed = parseInt(viewed) + 1;
            this.updateCookie('viewed', viewed);
        }

    },

    addToScore: function (score) {
        this.score += score;
        this.scoreText.text = this.score;
    },

    setCookie: function (name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    },
    getCookie: function (name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    },
    updateCookie: function (name, value) {
        this.eraseCookie(name);
        this.setCookie(name, value, 3);
    },
    eraseCookie: function (name) {
        document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    },

    bombEnemies: function () {
        this.enemyPool.forEach((enemy) => {
            if (enemy.alive) {
                this.explode(enemy);
                enemy.kill();
            }
        });
    },

    quitGame: function (pointer) {

        //  Here you should destroy anything you no longer need.
        //  Stop music, delete sprites, purge caches, free resources, all that good stuff.

        //  Then let's go back to the main menu.
        this.state.start('MainMenu');

    }

};
