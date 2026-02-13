AFRAME.registerComponent('donkey-kong-logic', {
  init() {
    this.player = document.querySelector('#player');
    this.world = this.el;
    
    // Parametri Player
    this.playerPos = {x: -0.4, y: -0.6};
    this.vel = {x: 0, y: 0};
    this.keys = {left: false, right: false, up: false, down: false};
    
    // Gestione Arance
    this.oranges = [];
    this.spawnTimer = 0;

    // DEFINIAMO IL PERCORSO FISSO (Waypoints)
    // Ogni punto è dove l'arancia deve passare. 
    // Il sistema le farà scivolare da un punto all'altro.
    this.path = [
      {x: -0.4, y: 0.8},  // Punto 0: Partenza dal Boss (cima)
      {x:  0.4, y: 0.75}, // Punto 1: Fine prima piattaforma (destra)
      {x:  0.4, y: 0.25}, // Punto 2: Caduta su seconda piattaforma
      {x: -0.4, y: 0.2},  // Punto 3: Fine seconda piattaforma (sinistra)
      {x: -0.4, y: -0.25},// Punto 4: Caduta su terza piattaforma
      {x:  0.5, y: -0.3}, // Punto 5: Fine terza piattaforma (destra)
      {x:  0.5, y: -0.75},// Punto 6: Caduta su ultima piattaforma
      {x: -1.0, y: -0.8}  // Punto 7: Uscita di scena a sinistra
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
      if (this.isGrounded) this.vel.y = 0.012;
    });
  },

  tick(t, dt) {
    if (dt > 100) return;
    this.updatePlayer(dt);
    this.updateOranges(dt);
  },

  updatePlayer(dt) {
    // ... (Mantieni la logica del movimento player e scale che avevamo prima)
    // Assicurati che le collisioni player-piattaforma usino i valori fissi delle tue piattaforme
    
    // Esempio rapido movimento orizzontale
    if (this.keys.left) this.playerPos.x -= 0.0008 * dt;
    if (this.keys.right) this.playerPos.x += 0.0008 * dt;
    
    // Gravità semplice per player
    this.vel.y -= 0.00003 * dt;
    this.playerPos.y += this.vel.y;

    // Limiti terra (placeholder per semplicità, adattalo alle tue piattaforme)
    if(this.playerPos.y < -0.8) { this.playerPos.y = -0.8; this.vel.y = 0; this.isGrounded = true; }
    
    this.player.object3D.position.set(this.playerPos.x, this.playerPos.y, 0.05);
  },

  updateOranges(dt) {
    this.spawnTimer += dt;
    if (this.spawnTimer > 3500) { // Un'arancia ogni 3.5 secondi
      this.spawnOrange();
      this.spawnTimer = 0;
    }

    for (let i = this.oranges.length - 1; i >= 0; i--) {
      let o = this.oranges[i];
      let target = this.path[o.targetIdx];

      // Muovi l'arancia verso il prossimo waypoint
      let dx = target.x - o.x;
      let dy = target.y - o.y;
      let distance = Math.sqrt(dx*dx + dy*dy);

      if (distance < 0.05) {
        // Arrivata al punto! Passa al prossimo
        o.targetIdx++;
        if (o.targetIdx >= this.path.length) {
          this.world.removeChild(o.el);
          this.oranges.splice(i, 1);
          continue;
        }
      } else {
        // Calcolo direzione e movimento fluido
        o.x += (dx / distance) * 0.0005 * dt;
        o.y += (dy / distance) * 0.0005 * dt;
      }

      o.el.object3D.position.set(o.x, o.y, 0.05);
      o.el.object3D.rotation.z -= 0.1 * dt; // Ruota sempre

      // Collisione con Player
      let pDist = Math.sqrt(Math.pow(o.x - this.playerPos.x, 2) + Math.pow(o.y - this.playerPos.y, 2));
      if (pDist < 0.12) this.resetGame();
    }
  },

  spawnOrange() {
    let el = document.createElement('a-image');
    el.setAttribute('src', '#orangeImg');
    el.setAttribute('width', 0.12); el.setAttribute('height', 0.12);
    this.world.appendChild(el);
    this.oranges.push({
      el: el,
      x: this.path[0].x,
      y: this.path[0].y,
      targetIdx: 1 // Punta subito al secondo waypoint
    });
  },

  resetGame() {
    this.playerPos = {x: -0.4, y: -0.6};
    this.vel = {x: 0, y: 0};
    this.oranges.forEach(o => this.world.removeChild(o.el));
    this.oranges = [];
    // Opzionale: alert("Preso!");
  }
});
