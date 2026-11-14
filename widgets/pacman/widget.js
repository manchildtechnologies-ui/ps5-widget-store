// Maze-chase arcade game for Welcome Hub. D-pad selects a direction button;
// X steers. Square starts a fresh game.
(function (wh) {
  var React = wh.React, View = wh.View, Label = wh.Label, ce = React.createElement;
  var FONT = wh.FontSizePS || { Size3XSmall: 18, Size4XSmall: 15 };
  var CELL = 24, COLS = 17, ROWS = 13, STEP_MS = 250;
  var WALL = '#1645a3', WALL_EDGE = '#3477ff', BACK = '#050814';
  var MAZE = [
    '#################',
    '#...............#',
    '#.###.###.###.###',
    '#...#...#...#...#',
    '#.#.#.#.#.#.#.#.#',
    '#.#...#...#...#.#',
    '#.###.#.#.###.#.#',
    '#...............#',
    '#.###.#.#.###.#.#',
    '#.#...#...#...#.#',
    '#.#.#.#.#.#.#.#.#',
    '#o.............o#',
    '#################'
  ];
  var DIR = {
    up: { x: 0, y: -1, label: 'UP' },
    down: { x: 0, y: 1, label: 'DOWN' },
    left: { x: -1, y: 0, label: 'LEFT' },
    right: { x: 1, y: 0, label: 'RIGHT' }
  };
  var GHOST_COLORS = ['#ff4e78', '#46d8ff', '#ff9c3d'];

  function key(x, y) { return x + ',' + y; }
  function isOpen(x, y) { return y >= 0 && y < ROWS && x >= 0 && x < COLS && MAZE[y].charAt(x) !== '#'; }
  function same(a, b) { return a.x === b.x && a.y === b.y; }
  function makeGhosts() {
    return [
      { x: 8, y: 7, homeX: 8, homeY: 7, color: GHOST_COLORS[0], dx: 0, dy: -1 },
      { x: 1, y: 11, homeX: 1, homeY: 11, color: GHOST_COLORS[1], dx: 1, dy: 0 },
      { x: 15, y: 11, homeX: 15, homeY: 11, color: GHOST_COLORS[2], dx: -1, dy: 0 }
    ];
  }
  function makeGame() {
    var pellets = {}, total = 0, x, y;
    for (y = 0; y < ROWS; y++) for (x = 0; x < COLS; x++) {
      var cell = MAZE[y].charAt(x);
      if (cell === '.' || cell === 'o') { pellets[key(x, y)] = cell === 'o' ? 2 : 1; total++; }
    }
    // Start on an open square without leaving a pellet under the player.
    delete pellets[key(8, 1)]; total--;
    return {
      player: { x: 8, y: 1, dx: 1, dy: 0 },
      ghosts: makeGhosts(), pellets: pellets, remaining: total,
      score: 0, lives: 3, tick: 0, powerUntil: 0, over: ''
    };
  }
  function ghostStep(ghost, player, frightened) {
    var candidates = [], dirs = [DIR.up, DIR.left, DIR.down, DIR.right], i;
    for (i = 0; i < dirs.length; i++) {
      var d = dirs[i], nx = ghost.x + d.x, ny = ghost.y + d.y;
      if (isOpen(nx, ny)) candidates.push({ x: nx, y: ny, dx: d.x, dy: d.y });
    }
    if (candidates.length > 1) {
      var forward = candidates.filter(function (p) { return !(p.dx === -ghost.dx && p.dy === -ghost.dy); });
      if (forward.length) candidates = forward;
    }
    if (!candidates.length) return ghost;
    var chase = !frightened && Math.random() < 0.72;
    candidates.sort(function (a, b) {
      var da = Math.abs(a.x - player.x) + Math.abs(a.y - player.y);
      var db = Math.abs(b.x - player.x) + Math.abs(b.y - player.y);
      return frightened ? db - da : (chase ? da - db : Math.random() - 0.5);
    });
    var chosen = candidates[0];
    return { x: chosen.x, y: chosen.y, homeX: ghost.homeX, homeY: ghost.homeY, color: ghost.color, dx: chosen.dx, dy: chosen.dy };
  }
  function advance(game, requested) {
    if (game.over) return game;
    var tick = game.tick + 1, d = requested || { x: game.player.dx, y: game.player.dy };
    var nx = game.player.x + d.x, ny = game.player.y + d.y;
    if (!isOpen(nx, ny)) {
      d = { x: game.player.dx, y: game.player.dy };
      nx = game.player.x + d.x; ny = game.player.y + d.y;
    }
    var player = isOpen(nx, ny) ? { x: nx, y: ny, dx: d.x, dy: d.y } : game.player;
    var pellets = game.pellets, pellet = pellets[key(player.x, player.y)] || 0;
    var remaining = game.remaining, score = game.score, powerUntil = game.powerUntil;
    if (pellet) {
      pellets = {};
      for (var p in game.pellets) if (Object.prototype.hasOwnProperty.call(game.pellets, p) && p !== key(player.x, player.y)) pellets[p] = game.pellets[p];
      remaining--;
      score += pellet === 2 ? 50 : 10;
      if (pellet === 2) powerUntil = tick + 24;
    }
    var ghosts = game.ghosts;
    if (tick % 2 === 0) ghosts = game.ghosts.map(function (g) { return ghostStep(g, player, tick < powerUntil); });
    var lives = game.lives, powered = tick < powerUntil, caught = false, i;
    for (i = 0; i < ghosts.length; i++) {
      if (!same(player, ghosts[i])) continue;
      if (powered) {
        score += 200;
        ghosts = ghosts.slice();
        ghosts[i] = { x: ghosts[i].homeX, y: ghosts[i].homeY, homeX: ghosts[i].homeX, homeY: ghosts[i].homeY, color: ghosts[i].color, dx: 0, dy: -1 };
      } else { lives--; caught = true; break; }
    }
    if (caught) {
      if (lives <= 0) return { player: player, ghosts: ghosts, pellets: pellets, remaining: remaining, score: score, lives: 0, tick: tick, powerUntil: 0, over: 'GAME OVER' };
      player = { x: 8, y: 1, dx: 1, dy: 0 };
      ghosts = makeGhosts();
      powerUntil = 0;
    }
    return { player: player, ghosts: ghosts, pellets: pellets, remaining: remaining, score: score, lives: lives, tick: tick, powerUntil: powerUntil, over: remaining <= 0 ? 'MAZE CLEARED!' : '' };
  }

  function DirectionButton(props) {
    var selected = props.selected;
    return ce(wh.Focusable, {
      onPress: props.onPress,
      style: { flex: 1, height: 42, marginHorizontal: 3, borderRadius: 10, backgroundColor: selected ? '#263e80' : '#171e31', borderWidth: 2, borderColor: selected ? '#6ea8ff' : '#39445c', alignItems: 'center', justifyContent: 'center' },
      focusedStyle: { borderColor: '#ffffff', borderWidth: 3 }
    }, ce(Label, { style: { fontSize: FONT.Size4XSmall, color: '#ffffff', fontWeight: 'bold' } }, props.label));
  }
  function Ghost(props) {
    var color = props.frightened ? '#526dff' : props.color;
    return ce(View, { style: { width: 18, height: 18, borderRadius: 9, backgroundColor: color, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' } },
      ce(View, { style: { width: 4, height: 6, borderRadius: 2, backgroundColor: '#ffffff', marginHorizontal: 1 } }),
      ce(View, { style: { width: 4, height: 6, borderRadius: 2, backgroundColor: '#ffffff', marginHorizontal: 1 } })
    );
  }

  function PacMan(props) {
    var pair = React.useState(makeGame());
    var game = pair[0], setGame = pair[1];
    var gameRef = React.useRef(game), directionRef = React.useRef(DIR.right);
    var directionPair = React.useState('right'), directionName = directionPair[0], setDirectionName = directionPair[1];
    gameRef.current = game;
    React.useEffect(function () {
      var timer = setInterval(function () {
        setGame(function (current) {
          var next = advance(current, directionRef.current);
          gameRef.current = next;
          return next;
        });
      }, STEP_MS);
      return function () { clearInterval(timer); };
    }, []);
    function steer(name) { directionRef.current = DIR[name]; setDirectionName(name); }
    function restart() {
      var fresh = makeGame();
      gameRef.current = fresh; directionRef.current = DIR.right; setDirectionName('right'); setGame(fresh);
    }
    wh.onPressed(wh.Button.Square, restart);
    var ghostMap = {};
    for (var gi = 0; gi < game.ghosts.length; gi++) ghostMap[key(game.ghosts[gi].x, game.ghosts[gi].y)] = game.ghosts[gi];
    var rows = [];
    for (var y = 0; y < ROWS; y++) {
      var cells = [];
      for (var x = 0; x < COLS; x++) {
        var cellKey = key(x, y), wall = MAZE[y].charAt(x) === '#', pellet = game.pellets[cellKey] || 0;
        var ghost = ghostMap[cellKey], isPlayer = game.player.x === x && game.player.y === y;
        var content = null;
        if (isPlayer) {
          content = ce(View, { style: { width: 19, height: 19, borderRadius: 10, backgroundColor: '#ffd62e', alignItems: 'center', justifyContent: 'center' } },
            ce(View, { style: { position: 'absolute', right: -1, width: 0, height: 0, borderTopWidth: 5, borderBottomWidth: 5, borderLeftWidth: 8, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: BACK, transform: [{ rotate: (game.player.dx === -1 ? '180deg' : (game.player.dy === -1 ? '-90deg' : (game.player.dy === 1 ? '90deg' : '0deg'))) }] } })
          );
        } else if (ghost) content = ce(Ghost, { color: ghost.color, frightened: game.tick < game.powerUntil });
        else if (pellet) content = ce(View, { style: { width: pellet === 2 ? 10 : 5, height: pellet === 2 ? 10 : 5, borderRadius: 6, backgroundColor: pellet === 2 ? '#ffffff' : '#ffe7a3' } });
        cells.push(ce(View, { key: cellKey, style: { width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center', backgroundColor: wall ? WALL : BACK, borderRadius: wall ? 5 : 0, borderWidth: wall ? 1 : 0, borderColor: WALL_EDGE } }, content));
      }
      rows.push(ce(View, { key: 'row-' + y, style: { flexDirection: 'row' } }, cells));
    }
    var cfg = props.config || {}, width = props.width || 504, height = props.height || 504;
    var status = game.over || ('LIVES  ' + game.lives);
    return ce(View, { style: { width: width, height: height, padding: 12, borderRadius: 16, backgroundColor: '#080d1c', alignItems: 'center', overflow: 'hidden' } },
      ce(View, { style: { width: '100%', height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 } },
        ce(wh.Title, { iconId: cfg.glyph && cfg.id ? 'wh:' + cfg.id : (cfg.iconId || 'grid'), badge: String(game.score) }, cfg.title || 'Pac-Man'),
        ce(Label, { style: { fontSize: FONT.Size4XSmall, color: '#ffe36e', fontWeight: 'bold' } }, status)
      ),
      ce(View, { style: { padding: 3, borderRadius: 8, borderWidth: 2, borderColor: WALL_EDGE, backgroundColor: BACK } }, rows),
      game.over ? ce(Label, { style: { position: 'absolute', top: 205, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, overflow: 'hidden', backgroundColor: '#141c35', color: '#ffe36e', fontSize: FONT.Size3XSmall, fontWeight: 'bold' } }, game.over + '  ·  □ RESTART') : null,
      ce(View, { style: { width: '100%', height: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 } },
        ['up', 'left', 'down', 'right'].map(function (name) { return ce(DirectionButton, { key: name, label: DIR[name].label, selected: directionName === name, onPress: function () { steer(name); } }); })
      ),
      ce(Label, { style: { fontSize: FONT.Size4XSmall, color: '#abb9d8', marginTop: 4 } }, props.active ? 'ARROWS: PICK   X: STEER   □: RESTART' : 'X: ENTER TO PLAY')
    );
  }
  wh.register(PacMan);
})(globalThis.__wh);
