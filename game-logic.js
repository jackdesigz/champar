AFRAME.registerComponent('donkey-kong-logic', {
  init() {
    this.player = document.querySelector('#player');
    this.world = this.el;
    
    // FISICA PLAYER
    this.playerPos = {x: -0.4, y: -0.6};
    this.vel = {x: 0, y: 0};
    this.keys = {left: false, right: false, up: false, down: false};
    this.isGrounded = false;
    this.isClimbing = false;

    // Rilevamento piattaforme e scale (per collisioni player)
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

    // GESTIONE ARANCE (Waypoints corretti per zig-zag)
    this.oranges = [];
    this.spawnTimer = 0;

    // IMPORTANTE: Modifica questi punti per farli combaciare con le TUE piattaforme visive
    this.path = [
      {x: -0.4, y: 0.85}, // Partenza Boss
      {x:  0.4, y: 0.80}, // Fine 1a piattaforma (va verso destra)
      {x:  0.4, y: 0.35}, // Cade su 2a piattaforma
      {x: -0.4, y: 0.30}, // Fine 2a piattaforma (va verso sinistra)
      {x: -0.4, y: -0.15},// Cade su 3a piattaforma
      {x:  0.4, y: -0.20},// Fine 3a piattaforma (va verso destra)
      {x:  0.4, y: -0.75},// Cade su ultima piattaforma
      {x: -1.2, y: -0.80} // Esce di scena a sinistra
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
      if (this.isGrounded && !this.isClimbing) this.vel.y = 0.015; // Salto un po' più potente
    });
  },

  tick(t, dt) {
    if (dt > 100) return;

    // 1. LOGICA SCALE (Il player tocca una scala?)
    let ladder = this.ladders.find(l => 
      Math.abs(this.playerPos.x - l.x) < 0.1 && 
      this.playerPos.y > l.y - l.h/2 && 
      this.playerPos.y < l.y + l.h/2
    );

    if (ladder && (this.keys.up || this.keys.down)) {
      this.isClimbing = true;
      this.vel.y = 0;
      if (this.keys.up) this.playerPos.y += 0.0006 * dt;
      if (this.keys.down) this.playerPos.y -= 0.0006 * dt;
    } else {
      this.isClimbing = false;
    }

    // 2. MOVIMENTO PLAYER
    if (!this.isClimbing) {
      if (this.keys.left) this.playerPos.x -= 0.001 * dt;
      if (this.keys.right) this.playerPos.x += 0.001 * dt;
      
      this.vel.y -= 0.00004 * dt; // Gravità
      this.playerPos.y += this.vel.y;

      // Collisioni Piattaforme
      this.isGrounded = false;
      if (this.vel.y <= 0) {
        for (let p of this.platforms) {
          let dx = this.playerPos.x - p.x;
          if (Math.abs(dx) < p.w / 2) {
            let groundY = p.y + Math.tan(p.angle) * dx + 0.08; 
            if (this.playerPos.y < groundY && this.playerPos.y > groundY - 0.15) {
              this.playerPos.y = groundY;
              this.vel.y = 0;
              this.isGrounded = true;
            }
          }
        }
      }
    }

    // Applica posizione (Z = 0.1 per evitare clipping con le piattaforme a Z = 0)
    this.player.object3D.position.set(this.playerPos.x, this.playerPos.y, 0.1);

    this.updateOranges(dt);
  },

  updateOranges(dt) {
    this.spawnTimer += dt;
    if (this.spawnTimer > 3500) { this.spawnOrange(); this.spawnTimer = 0; }

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
      // Z = 0.1 per le arance
      o.el.object3D.position.set(o.x, o.y, 0.1);
      o.el.object3D.rotation.z -= 0.2 * dt;

      // Collisione con Player
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
    this.playerPos = {x: -0.4, y: -0.6};
    this.vel = {x: 0, y: 0};
    this.oranges.forEach(o => this.world.removeChild(o.el));
    this.oranges = [];
  }
});
