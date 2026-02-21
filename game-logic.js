AFRAME.registerComponent('donkey-kong-logic', {
  init() {
    this.player = document.querySelector('#player');
    this.boss = document.querySelector('#boss');
    this.world = this.el;
    
    this.playerPos = {x: -0.4, y: -0.6};
    this.vel = {x: 0, y: 0};
    this.keys = {left: false, right: false, up: false, down: false, jump: false};
    this.isGrounded = false;
    this.isClimbing = false;
    this.gameActive = true; 

    // Variabili per l'animazione del giocatore
    this.playerAnimTimer = 0;
    this.currentPlayerFrame = 1;

    this.platforms = Array.from(document.querySelectorAll('.platform')).map(el => ({
      x: el.getAttribute('position').x,
      y: el.getAttribute('position').y,
      w: parseFloat(el.getAttribute('width')),
      angle: (el.getAttribute('rotation').z * Math.PI) / 180
    }));

    this.ladders = Array.from(document.querySelectorAll('.ladder')).map(el => ({
      x: el.getAttribute('position').x,
      y: el.getAttribute('position').y,
      h: parseFloat(el.getAttribute('height')),
      w: parseFloat(el.getAttribute('width'))
    }));

    this.oranges = [];
    this.spawnTimer = 0;
    this.currentBossFrame = '#spiritello001'; 
    
    this.path = [
      {x: -0.4, y: 0.76}, 
      {x:  0.2, y: 0.76}, 
      {x:  0.2, y: 0.28}, 
      {x: -0.4, y: 0.23}, 
      {x: -0.4, y: -0.21},
      {x:  0.4, y: -0.27},
      {x:  0.4, y: -0.71},
      {x: -0.8, y: -0.80} 
    ];

    this.setupControls();
  },

  setupControls() {
    const bind = (id, k) => {
      const el = document.getElementById(id);
      if(!el) return;
      el.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[k] = true; });
      el.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[k] = false; });
    };
    bind('btn-left', 'left'); bind('btn-right', 'right');
    bind('btn-up', 'up'); bind('btn-down', 'down');
    
    const btnJump = document.getElementById('btn-jump');
    if(btnJump) {
      btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault(); 
        this.keys.jump = true; 
        if (this.isGrounded && !this.isClimbing && this.gameActive) {
          this.vel.y = 0.016; 
        }
      });
      btnJump.addEventListener('touchend', (e) => {
        e.preventDefault(); 
        this.keys.jump = false; 
      });
    }
  },

  tick(t, dt) {
    if (dt > 100 || !this.gameActive) return;

    let dxBoss = this.playerPos.x - (-0.4);
    let dyBoss = this.playerPos.y - (0.85);
    let distBoss = Math.sqrt(dxBoss*dxBoss + dyBoss*dyBoss);
    if (distBoss < 0.3) { this.winGame(); return; }

    let ladder = this.ladders.find(l => 
      Math.abs(this.playerPos.x - l.x) < 0.15 && 
      this.playerPos.y > l.y - l.h/2 - 0.1 && 
      this.playerPos.y < l.y + l.h/2 + 0.1
    );

    if (ladder && (this.keys.up || this.keys.down)) {
      this.isClimbing = true;
      this.vel.y = 0;
      if (this.keys.up) this.playerPos.y += 0.0008 * dt; 
      if (this.keys.down) this.playerPos.y -= 0.0008 * dt;
    } else {
      this.isClimbing = false;
    }

    if (!this.isClimbing) {
      if (this.keys.left) this.playerPos.x -= 0.001 * dt;
      if (this.keys.right) this.playerPos.x += 0.001 * dt;
      
      let gravity = 0.00008 * dt; 
      if (this.vel.y > 0 && this.keys.jump) {
         gravity = 0.00003 * dt; 
      }
      
      this.vel.y -= gravity; 
      this.playerPos.y += this.vel.y;

      this.isGrounded = false;
      if (this.vel.y <= 0) {
        for (let p of this.platforms) {
          let dx = this.playerPos.x - p.x;
          if (Math.abs(dx) < p.w / 2) {
            let groundY = p.y + Math.tan(p.angle) * dx + 0.08; 
            if (this.playerPos.y < groundY && this.playerPos.y > groundY - 0.2) {
              this.playerPos.y = groundY;
              this.vel.y = 0;
              this.isGrounded = true;
            }
          }
        }
      }
    }
    
    if (this.playerPos.y < -1.5) this.resetGame();
    this.player.object3D.position.set(this.playerPos.x, this.playerPos.y, 0.1);
    
    // ESEGUE LE FUNZIONI DI ANIMAZIONE E AGGIORNAMENTO
    this.animatePlayer(dt);
    this.animateBoss();
    this.updateOranges(dt);
  },

  // NUOVA FUNZIONE PER ANIMARE IL GIOCATORE
  animatePlayer(dt) {
    let targetFrame = '#player1'; // Default: In aria o fermo

    // 1. Controlla se sta camminando a terra
    if (this.isGrounded && !this.isClimbing && (this.keys.left || this.keys.right)) {
        this.playerAnimTimer += dt;
        
        // Cambia frame ogni 150 millisecondi (più è basso il numero, più veloce corre)
        if (this.playerAnimTimer > 150) { 
            this.currentPlayerFrame++;
            if (this.currentPlayerFrame > 4) this.currentPlayerFrame = 1; // Torna al frame 1 dopo il 4
            this.playerAnimTimer = 0;
        }
        targetFrame = `#player${this.currentPlayerFrame}`;
    } else {
        // Se si ferma o salta, riazzera l'animazione
        this.currentPlayerFrame = 1;
        this.playerAnimTimer = 0;
    }

    // 2. Ruota il giocatore in base alla direzione
    if (this.keys.left) {
        this.player.object3D.rotation.y = Math.PI; // 180 gradi (guarda a sinistra)
    } else if (this.keys.right) {
        this.player.object3D.rotation.y = 0; // 0 gradi (guarda a destra)
    }

    // 3. Applica l'immagine solo se è cambiata
    if (this.player.getAttribute('src') !== targetFrame) {
        this.player.setAttribute('src', targetFrame);
    }
  },

  animateBoss() {
    let targetFrame = '#spiritello001'; 
    if (this.spawnTimer > 2000 && this.spawnTimer <= 2800) {
        targetFrame = '#spiritello002'; 
    } else if (this.spawnTimer > 2800) {
        targetFrame = '#spiritello003'; 
    }
    if (this.currentBossFrame !== targetFrame) {
        this.boss.setAttribute('src', targetFrame);
        this.currentBossFrame = targetFrame; 
    }
  },

  updateOranges(dt) {
    this.spawnTimer += dt; 
    if (this.spawnTimer > 3000) { this.spawnOrange(); this.spawnTimer = 0; }

    for (let i = this.oranges.length - 1; i >= 0; i--) {
      let o = this.oranges[i];
      let target = this.path[o.targetIdx];
      let dx = target.x - o.x;
      let dy = target.y - o.y;
      let dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < 0.05) {
        o.targetIdx++;
        if (o.targetIdx >= this.path.length) {
          this.world.removeChild(o.el);
          this.oranges.splice(i, 1);
          continue;
        }
      } else {
        o.x += (dx / dist) * 0.0006 * dt;
        o.y += (dy / dist) * 0.0006 * dt;
        
        if (Math.abs(dx) > 0.01) { 
            let rotDir = dx > 0 ? -1 : 1; 
            o.el.object3D.rotation.z += rotDir * 0.005 * dt; 
        }
      }
      o.el.object3D.position.set(o.x, o.y, 0.1);

      let pDist = Math.sqrt(Math.pow(o.x - this.playerPos.x, 2) + Math.pow(o.y - this.playerPos.y, 2));
      if (pDist < 0.1) this.resetGame();
    }
  },

  spawnOrange() {
    let el = document.createElement('a-image');
    el.setAttribute('src', '#orangeImg');
    el.setAttribute('width', 0.12); el.setAttribute('height', 0.12);
    this.world.appendChild(el);
    this.oranges.push({ el, x: this.path[0].x, y: this.path[0].y, targetIdx: 1 });
  },

  resetGame() {
    const flash = document.getElementById('flash');
    if(flash) {
        flash.style.opacity = "0.6";
        setTimeout(() => { flash.style.opacity = "0"; }, 300);
    }
    this.playerPos = {x: -0.4, y: -0.6};
    this.vel = {x: 0, y: 0};
    this.keys.jump = false; 
    this.oranges.forEach(o => this.world.removeChild(o.el));
    this.oranges = [];
    this.spawnTimer = 0; 
  },

  winGame() {
      this.gameActive = false;
      document.getElementById('win-screen').style.display = 'block';
  }
});
