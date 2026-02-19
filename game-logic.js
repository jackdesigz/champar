AFRAME.registerComponent('donkey-kong-logic', {
  init() {
    this.player = document.querySelector('#player');
    this.boss = document.querySelector('#boss');
    this.world = this.el;
    
    this.playerPos = {x: -0.4, y: -0.6};
    this.vel = {x: 0, y: 0};
    this.keys = {left: false, right: false, up: false, down: false};
    this.isGrounded = false;
    this.isClimbing = false;
    this.gameActive = true; 

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
    
    // PERCORSO ARANCE RICALCOLATO (Segue esattamente l'angolo delle piattaforme)
    this.path = [
      {x: -0.4, y: 0.76},  // Inizio vicino al boss
      {x:  0.2, y: 0.76},  // Bordo piattaforma alta
      {x:  0.2, y: 0.24},  // Caduta verticale sulla 2° piattaforma
      {x: -0.4, y: 0.29},  // Rotola a sinistra (inclinata in su)
      {x: -0.4, y: -0.27}, // Caduta verticale sulla 3° piattaforma
      {x:  0.4, y: -0.21}, // Rotola a destra (inclinata in giù)
      {x:  0.4, y: -0.77}, // Caduta verticale sull'ultima piattaforma
      {x: -0.8, y: -0.68}  // Esce di scena a sinistra rotolando in salita
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
      // SALTO RIDOTTO: Da 0.022 a 0.015 per non toccare il soffitto
      if (this.isGrounded && !this.isClimbing && this.gameActive) this.vel.y = 0.015;
    });
  },

  tick(t, dt) {
    if (dt > 100 || !this.gameActive) return;

    let dxBoss = this.playerPos.x - (-0.4);
    let dyBoss = this.playerPos.y - (0.85);
    let distBoss = Math.sqrt(dxBoss*dxBoss + dyBoss*dyBoss);
    
    if (distBoss < 0.3) { 
        this.winGame();
        return;
    }

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
      
      this.vel.y -= 0.00005 * dt; 
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
    
    this.animateBoss();
    this.updateOranges(dt);
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
    
    if (this.spawnTimer > 3000) { 
        this.spawnOrange(); 
        this.spawnTimer = 0; 
    }

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
        
        // NUOVA ROTAZIONE LOGICA
        if (Math.abs(dx) > 0.01) { 
            // Se va a destra (dx > 0) ruota in senso orario (-), altrimenti antiorario (+)
            let rotDir = dx > 0 ? -1 : 1; 
            o.el.object3D.rotation.z += rotDir * 0.005 * dt; // Molto più lenta e realistica
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
    this.oranges.forEach(o => this.world.removeChild(o.el));
    this.oranges = [];
    this.spawnTimer = 0; 
  },

  winGame() {
      this.gameActive = false;
      document.getElementById('win-screen').style.display = 'block';
  }
});
