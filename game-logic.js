AFRAME.registerComponent('donkey-kong-logic', {
  init() {
    this.player = document.querySelector('#player');
    this.boss = document.querySelector('#boss'); // Riferimento allo Spiritello
    this.world = this.el;
    
    // FISICA
    this.playerPos = {x: -0.4, y: -0.6};
    this.vel = {x: 0, y: 0};
    this.keys = {left: false, right: false, up: false, down: false};
    this.isGrounded = false;
    this.isClimbing = false;
    this.gameActive = true; 

    // Rilevamento piattaforme e scale
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

    // ARANCE
    this.oranges = [];
    this.spawnTimer = 0;
    
    // PERCORSO ARANCE
    this.path = [
      {x: -0.4, y: 0.85}, 
      {x:  0.0, y: 0.82}, 
      {x:  0.4, y: 0.78}, 
      {x:  0.4, y: 0.35}, 
      {x:  0.0, y: 0.32}, 
      {x: -0.4, y: 0.28}, 
      {x: -0.4, y: -0.15}, 
      {x:  0.0, y: -0.18},
      {x:  0.4, y: -0.22},
      {x:  0.4, y: -0.75}, 
      {x: -1.2, y: -0.80}
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
    
    document.getElementById('btn-jump').addEventListener('touchstart', (e) => {
      if (this.isGrounded && !this.isClimbing && this.gameActive) this.vel.y = 0.022;
    });
  },

  tick(t, dt) {
    if (dt > 100 || !this.gameActive) return;

    // 1. CONTROLLO VITTORIA
    let dxBoss = this.playerPos.x - (-0.4);
    let dyBoss = this.playerPos.y - (0.85);
    let distBoss = Math.sqrt(dxBoss*dxBoss + dyBoss*dyBoss);
    
    if (distBoss < 0.3) { 
        this.winGame();
        return;
    }

    // 2. SCALE
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

    // 3. MOVIMENTO PLAYER
    if (!this.isClimbing) {
      if (this.keys.left) this.playerPos.x -= 0.001 * dt;
      if (this.keys.right) this.playerPos.x += 0.001 * dt;
      
      this.vel.y -= 0.00005 * dt; 
      this.playerPos.y += this.vel.y;

      // Collisioni Piattaforme
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
    
    // Limite caduta mondo
    if (this.playerPos.y < -1.5) this.resetGame();

    this.player.object3D.position.set(this.playerPos.x, this.playerPos.y, 0.1);
    
    // ESEGUE L'AGGIORNAMENTO DELLE ARANCE E L'ANIMAZIONE DELLO SPIRITELLO
    this.updateOranges(dt);
    this.animateBoss();
  },

  // NUOVA FUNZIONE PER ANIMARE LO SPIRITELLO
  animateBoss() {
    let currentFrame = '#spiritello001'; // Default: in attesa
    
    // Controlla a che punto è il timer (spawnTimer va da 0 a 3000)
    if (this.spawnTimer > 2000 && this.spawnTimer <= 2800) {
        currentFrame = '#spiritello002'; // Prepara il lancio
    } else if (this.spawnTimer > 2800) {
        currentFrame = '#spiritello003'; // Lancia!
    }

    // Cambia l'immagine solo se il frame è diverso da quello attuale (per ottimizzare)
    if (this.boss.getAttribute('src') !== currentFrame) {
        this.boss.setAttribute('src', currentFrame);
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
      }
      o.el.object3D.position.set(o.x, o.y, 0.1);
      o.el.object3D.rotation.z -= 0.05 * dt;

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
    this.oranges.forEach(o => this.world.removeChild(o.el));
    this.oranges = [];
    this.spawnTimer = 0; // Azzera il timer così l'animazione riparte corretta
  },

  winGame() {
      this.gameActive = false;
      document.getElementById('win-screen').style.display = 'block';
  }
});
