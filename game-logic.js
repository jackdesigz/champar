AFRAME.registerComponent('donkey-kong-logic', {
  init() {
    this.player = document.querySelector('#player');
    this.world = this.el;
    this.platforms = Array.from(document.querySelectorAll('.platform')).map(el => ({
      x: el.getAttribute('position').x,
      y: el.getAttribute('position').y,
      w: parseFloat(el.getAttribute('width')),
      angle: (el.getAttribute('rotation').z * Math.PI) / 180
    }));
    this.ladders = Array.from(document.querySelectorAll('.ladder')).map(el => ({
      x: el.getAttribute('position').x, y: el.getAttribute('position').y,
      h: parseFloat(el.getAttribute('height')), w: parseFloat(el.getAttribute('width'))
    }));

    this.playerPos = {x: -0.4, y: -0.6};
    this.vel = {x: 0, y: 0};
    this.keys = {left: false, right: false, up: false, down: false};
    this.isClimbing = false;
    this.oranges = [];
    this.spawnTimer = 0;

    this.setupControls();
  },

  setupControls() {
    const bind = (id, k) => {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); this.keys[k] = true; });
      el.addEventListener('touchend', (e) => { e.preventDefault(); this.keys[k] = false; });
    };
    bind('btn-left', 'left'); bind('btn-right', 'right');
    bind('btn-up', 'up'); bind('btn-down', 'down');
    document.getElementById('btn-jump').addEventListener('touchstart', (e) => {
      if (this.isGrounded) this.vel.y = 0.012;
    });
  },

  tick(t, dt) {
    if (dt > 100) return;
    
    // Check Scale
    let onLadder = this.ladders.find(l => Math.abs(this.playerPos.x - l.x) < 0.1 && Math.abs(this.playerPos.y - l.y) < l.h/2);
    this.isClimbing = onLadder && (this.keys.up || this.keys.down);

    // Movimento
    if (this.keys.left) this.playerPos.x -= 0.0008 * dt;
    if (this.keys.right) this.playerPos.x += 0.0008 * dt;
    
    if (this.isClimbing) {
      this.vel.y = 0;
      if (this.keys.up) this.playerPos.y += 0.0005 * dt;
      if (this.keys.down) this.playerPos.y -= 0.0005 * dt;
    } else {
      this.vel.y -= 0.00003 * dt;
      this.playerPos.y += this.vel.y;
    }

    // Collisioni Piattaforme
    this.isGrounded = false;
    if (this.vel.y <= 0 && !this.isClimbing) {
      for (let p of this.platforms) {
        let dx = this.playerPos.x - p.x;
        if (Math.abs(dx) < p.w / 2) {
          let groundY = p.y + Math.tan(p.angle) * dx + 0.075;
          if (this.playerPos.y < groundY && this.playerPos.y > groundY - 0.2) {
            this.playerPos.y = groundY;
            this.vel.y = 0;
            this.isGrounded = true;
          }
        }
      }
    }

    this.player.object3D.position.set(this.playerPos.x, this.playerPos.y, 0.05);
    this.updateOranges(dt);
  },

  updateOranges(dt) {
    this.spawnTimer += dt;
    if (this.spawnTimer > 3000) {
      this.spawnOrange();
      this.spawnTimer = 0;
    }
    this.oranges.forEach((o, i) => {
      o.y += o.velY; o.x += o.velX; o.velY -= 0.0005;
      this.platforms.forEach(p => {
        let dx = o.x - p.x;
        if (Math.abs(dx) < p.w/2) {
          let gy = p.y + Math.tan(p.angle) * dx + 0.04;
          if (o.y < gy && o.y > gy - 0.1) {
            o.y = gy; o.velY = 0; o.velX = -Math.sin(p.angle) * 0.01;
          }
        }
      });
      o.el.object3D.position.set(o.x, o.y, 0.05);
      if (o.y < -2) { this.world.removeChild(o.el); this.oranges.splice(i, 1); }
      if (Math.sqrt((o.x-this.playerPos.x)**2 + (o.y-this.playerPos.y)**2) < 0.1) location.reload();
    });
  },

  spawnOrange() {
    let el = document.createElement('a-image');
    el.setAttribute('src', '#orangeImg');
    el.setAttribute('width', 0.1); el.setAttribute('height', 0.1);
    this.world.appendChild(el);
    this.oranges.push({ el, x: -0.4, y: 0.8, velX: 0.005, velY: 0 });
  }
});