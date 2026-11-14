(function (wh) {
  var React = wh.React, View = wh.View, Label = wh.Label, ce = React.createElement;
  var FONT = wh.FontSizePS || { Size3XSmall: 18, Size4XSmall: 15, SizeNormal: 30 };
  var COLS = 20, ROWS = 13, CELL = 22;
  var LCD = '#9bbc0f', DARK = '#0f380f', MID = '#306230', FOOD = '#d94b3d';
  var DIRECTIONS = {
    up: { x: 0, y: -1, label: '▲', name: 'UP' },
    down: { x: 0, y: 1, label: '▼', name: 'DOWN' },
    left: { x: -1, y: 0, label: '◀', name: 'LEFT' },
    right: { x: 1, y: 0, label: '▶', name: 'RIGHT' }
  };

  function makeGame() {
    return {
      body: [{ x: 8, y: 6 }, { x: 7, y: 6 }, { x: 6, y: 6 }],
      direction: DIRECTIONS.right,
      food: { x: 14, y: 6 },
      score: 0,
      over: false
    };
  }
  function sameCell(a, b) { return a.x === b.x && a.y === b.y; }
  function nextFood(body) {
    for (var i = 0; i < COLS * ROWS; i++) {
      var n = Math.floor(Math.random() * COLS * ROWS);
      var candidate = { x: n % COLS, y: Math.floor(n / COLS) };
      var occupied = false;
      for (var j = 0; j < body.length; j++) if (sameCell(body[j], candidate)) { occupied = true; break; }
      if (!occupied) return candidate;
    }
    return { x: 0, y: 0 };
  }
  function advance(game, requestedDirection) {
    if (game.over) return game;
    var direction = requestedDirection || game.direction;
    var head = { x: game.body[0].x + direction.x, y: game.body[0].y + direction.y };
    var eats = sameCell(head, game.food);
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return { body: game.body, direction: game.direction, food: game.food, score: game.score, over: true };
    var limit = game.body.length - (eats ? 0 : 1);
    for (var i = 0; i < limit; i++) if (sameCell(head, game.body[i])) return { body: game.body, direction: game.direction, food: game.food, score: game.score, over: true };
    var body = [head].concat(game.body.slice(0, eats ? game.body.length : game.body.length - 1));
    return { body: body, direction: direction, food: eats ? nextFood(body) : game.food, score: game.score + (eats ? 1 : 0), over: false };
  }

  function Snake(props) {
    var gamePair = React.useState(makeGame()), game = gamePair[0], setGame = gamePair[1];
    var directionPair = React.useState('right'), directionName = directionPair[0], setDirectionName = directionPair[1];
    var gameRef = React.useRef(game);
    var directionRef = React.useRef(DIRECTIONS.right);
    gameRef.current = game;

    React.useEffect(function () {
      var timer = setInterval(function () {
        setGame(function (current) {
          var next = advance(current, directionRef.current);
          gameRef.current = next;
          return next;
        });
      }, 250);
      return function () { clearInterval(timer); };
    }, []);

    function steer(name) {
      var next = DIRECTIONS[name];
      var current = gameRef.current.direction;
      if (next.x === -current.x && next.y === -current.y) return;
      directionRef.current = next;
      setDirectionName(name);
    }
    function restart() {
      var fresh = makeGame();
      directionRef.current = DIRECTIONS.right;
      gameRef.current = fresh;
      setDirectionName('right');
      setGame(fresh);
    }
    wh.onPressed(wh.Button.Square, restart);

    var bodyMap = {};
    for (var s = 0; s < game.body.length; s++) bodyMap[game.body[s].x + ',' + game.body[s].y] = s;
    var rows = [];
    for (var y = 0; y < ROWS; y++) {
      var cells = [];
      for (var x = 0; x < COLS; x++) {
        var key = x + ',' + y, segment = bodyMap[key], isSnake = segment !== undefined;
        var isFood = sameCell(game.food, { x: x, y: y });
        cells.push(ce(View, { key: key, style: {
          width: CELL - 2, height: CELL - 2, margin: 1,
          backgroundColor: isSnake ? (segment === 0 ? '#173c16' : DARK) : (isFood ? FOOD : 'transparent'),
          borderRadius: isFood ? 8 : 3,
          borderWidth: isSnake && segment === 0 ? 2 : 0,
          borderColor: '#d9f56b'
        } }));
      }
      rows.push(ce(View, { key: 'r' + y, style: { flexDirection: 'row', height: CELL } }, cells));
    }

    function directionButton(name) {
      var direction = DIRECTIONS[name];
      var chosen = directionName === name;
      return ce(wh.Focusable, {
        key: name,
        onPress: function () { steer(name); },
        style: { width: 106, height: 48, borderRadius: 10, backgroundColor: chosen ? '#315b2a' : '#263a26', borderWidth: 2, borderColor: chosen ? '#b4e75d' : MID, alignItems: 'center', justifyContent: 'center' },
        focusedStyle: { borderColor: '#ffffff', borderWidth: 3 }
      }, ce(View, { style: { flexDirection: 'row', alignItems: 'center' } },
        ce(Label, { style: { fontSize: FONT.SizeNormal, color: '#e8f7a2', marginRight: 7 } }, direction.label),
        ce(Label, { style: { fontSize: FONT.Size4XSmall, color: '#ffffff', fontWeight: 'bold' } }, direction.name)
      ));
    }

    var cfg = props.config || {};
    var width = props.width || 504, height = props.height || 504;
    return ce(View, { style: { width: width, height: height, padding: 14, borderRadius: 16, backgroundColor: '#17191e', alignItems: 'center', overflow: 'hidden' } },
      ce(View, { style: { width: '100%', height: 37, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 } },
        ce(wh.Title, { iconId: cfg.glyph && cfg.id ? 'wh:' + cfg.id : (cfg.iconId || 'grid') }, 'Snake'),
        ce(Label, { style: { fontSize: FONT.Size3XSmall, color: '#9bbc0f', fontWeight: 'bold' } }, 'SCORE  ' + String(game.score).padStart(3, '0'))
      ),
      ce(View, { style: { width: '100%', height: 320, backgroundColor: LCD, borderWidth: 7, borderColor: MID, borderRadius: 8, alignItems: 'center', justifyContent: 'center' } }, rows,
        game.over ? ce(View, { style: { position: 'absolute', left: 20, right: 20, top: 118, padding: 12, borderRadius: 10, backgroundColor: '#0f380fdd', alignItems: 'center' } }, ce(Label, { style: { fontSize: FONT.SizeNormal, color: '#e8f7a2', fontWeight: 'bold' } }, 'GAME OVER  ·  □ RESTART')) : null
      ),
      ce(View, { style: { width: '100%', height: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 9 } }, ['up', 'down', 'left', 'right'].map(directionButton)),
      ce(View, { style: { width: '100%', height: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 } },
        ce(Label, { style: { fontSize: FONT.Size4XSmall, color: '#9bbc0f' } }, props.active ? 'ARROWS: SELECT   X: STEER' : 'X: ENTER CONTROLS'),
        ce(Label, { style: { fontSize: FONT.Size4XSmall, color: '#9bbc0f', opacity: 0.75 } }, '□ RESTART')
      )
    );
  }
  wh.register(Snake);
})(globalThis.__wh);
