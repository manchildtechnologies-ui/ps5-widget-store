(function (wh) {
  var React = wh.React;
  var View = wh.View;
  var Text = wh.Text;
  var ce = React.createElement;
  var FONT = wh.FontSize || {};
  var S = { title: FONT.SizeXSmall || 24, body: FONT.Size3XSmall || 18, small: FONT.Size4XSmall || 15 };
  var COLS = 10;
  var ROWS = 20;
  var CELL = 20;
  var COLORS = { I: '#48d7e8', O: '#f5ca4e', T: '#ba79ed', S: '#6bd47d', Z: '#ed6873', J: '#6a95ed', L: '#f39c55' };
  var SHAPES = {
    I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    O: [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    T: [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    S: [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
    Z: [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
    J: [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    L: [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]]
  };
  var TYPES = ['I','O','T','S','Z','J','L'];

  function emptyBoard() {
    var board = [];
    for (var y = 0; y < ROWS; y++) board.push(new Array(COLS).fill(null));
    return board;
  }

  function newPiece(type) {
    var name = type || TYPES[Math.floor(Math.random() * TYPES.length)];
    return { type: name, matrix: SHAPES[name], x: 3, y: 0 };
  }

  function initialGame() {
    return { board: emptyBoard(), piece: newPiece(), score: 0, lines: 0, running: false, over: false };
  }

  function collides(board, piece, dx, dy, matrix) {
    var shape = matrix || piece.matrix;
    for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) {
      if (!shape[y][x]) continue;
      var bx = piece.x + x + (dx || 0), by = piece.y + y + (dy || 0);
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
    return false;
  }

  function settle(game) {
    var board = game.board.map(function (row) { return row.slice(); });
    for (var y = 0; y < 4; y++) for (var x = 0; x < 4; x++) {
      if (!game.piece.matrix[y][x]) continue;
      var by = game.piece.y + y, bx = game.piece.x + x;
      if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) board[by][bx] = game.piece.type;
    }
    var kept = board.filter(function (row) { return row.some(function (cell) { return !cell; }); });
    var cleared = ROWS - kept.length;
    while (kept.length < ROWS) kept.unshift(new Array(COLS).fill(null));
    var piece = newPiece();
    var over = collides(kept, piece, 0, 0);
    var points = cleared === 1 ? 100 : cleared === 2 ? 300 : cleared === 3 ? 500 : cleared === 4 ? 800 : 0;
    return { board: kept, piece: piece, score: game.score + points, lines: game.lines + cleared, running: !over, over: over };
  }

  function rotate(matrix) {
    var result = [];
    for (var y = 0; y < 4; y++) {
      result[y] = [];
      for (var x = 0; x < 4; x++) result[y][x] = matrix[3 - x][y];
    }
    return result;
  }

  function step(game) {
    if (!game.running || game.over) return game;
    if (!collides(game.board, game.piece, 0, 1)) {
      return { board: game.board, piece: { type: game.piece.type, matrix: game.piece.matrix, x: game.piece.x, y: game.piece.y + 1 }, score: game.score, lines: game.lines, running: true, over: false };
    }
    return settle(game);
  }

  function Button(props) {
    var focusedPair = React.useState(false);
    var focused = focusedPair[0];
    var setFocused = focusedPair[1];
    return ce(View, {
      focusable: true,
      onFocus: function () { setFocused(true); },
      onBlur: function () { setFocused(false); },
      onPress: props.onPress,
      style: {
        minWidth: props.compact ? 142 : (props.wide ? 156 : 108),
        height: props.compact ? 42 : 54,
        margin: 5,
        paddingHorizontal: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? '#356ac4' : (props.primary ? '#244b8b' : '#242932'),
        borderWidth: focused ? 3 : 1,
        borderColor: focused ? '#ffffff' : '#424955'
      }
    }, ce(Text, { style: { fontSize: S.body, color: '#ffffff', fontWeight: 'bold' } }, props.label));
  }

  function Tetris(props) {
    var gamePair = React.useState(initialGame);
    var game = gamePair[0];
    var setGame = gamePair[1];
    React.useEffect(function () {
      if (!game.running) return undefined;
      var timer = setInterval(function () { setGame(function (current) { return step(current); }); }, 650);
      return function () { clearInterval(timer); };
    }, [game.running]);

    function start() { setGame(function () { var g = initialGame(); g.running = true; return g; }); }
    function move(dx) {
      setGame(function (g) {
        if (!g.running || collides(g.board, g.piece, dx, 0)) return g;
        return { board: g.board, piece: { type: g.piece.type, matrix: g.piece.matrix, x: g.piece.x + dx, y: g.piece.y }, score: g.score, lines: g.lines, running: g.running, over: g.over };
      });
    }
    function turn() {
      setGame(function (g) {
        if (!g.running) return g;
        var matrix = rotate(g.piece.matrix);
        if (collides(g.board, g.piece, 0, 0, matrix)) return g;
        return { board: g.board, piece: { type: g.piece.type, matrix: matrix, x: g.piece.x, y: g.piece.y }, score: g.score, lines: g.lines, running: g.running, over: g.over };
      });
    }
    function drop() {
      setGame(function (g) {
        if (!g.running) return g;
        var current = g;
        while (current.running && !collides(current.board, current.piece, 0, 1)) {
          current = { board: current.board, piece: { type: current.piece.type, matrix: current.piece.matrix, x: current.piece.x, y: current.piece.y + 1 }, score: current.score + 1, lines: current.lines, running: true, over: false };
        }
        return settle(current);
      });
    }
    function softDrop() { setGame(function (g) { return step(g); }); }

    var boardChildren = [];
    for (var y = 0; y < ROWS; y++) {
      var rowChildren = [];
      for (var x = 0; x < COLS; x++) {
        var value = game.board[y][x];
        if (game.piece.matrix) {
          var px = x - game.piece.x, py = y - game.piece.y;
          if (px >= 0 && px < 4 && py >= 0 && py < 4 && game.piece.matrix[py][px]) value = game.piece.type;
        }
        rowChildren.push(ce(View, { key: 'c' + x, style: {
          width: CELL, height: CELL, borderWidth: 1, borderColor: '#252a32',
          backgroundColor: value ? COLORS[value] : '#101318'
        } }));
      }
      boardChildren.push(ce(View, { key: 'r' + y, style: { flexDirection: 'row', height: CELL } }, rowChildren));
    }

    var status = game.over ? 'GAME OVER' : (game.running ? 'BLOCKS FALLING' : 'READY TO PLAY');
    return ce(View, { style: {
      width: props.width || 1032, height: props.height || 504, padding: 14,
      borderRadius: 16, backgroundColor: '#17191e', flexDirection: 'row'
    } },
      ce(View, { style: { width: 290, alignItems: 'center', justifyContent: 'center' } },
        ce(View, { style: { width: COLS * CELL, height: ROWS * CELL, borderWidth: 2, borderColor: '#59616e', backgroundColor: '#101318' } }, boardChildren)
      ),
      ce(View, { style: { flex: 1, paddingLeft: 20, justifyContent: 'center' } },
        ce(View, { style: { flexDirection: 'row', alignItems: 'center' } },
          ce(wh.Title, { iconId: 'wh:blockris', style: { flex: 1 } }, 'FALLING BLOCKS'),
          ce(Button, { label: game.running ? 'RESTART' : 'START', compact: true, primary: true, onPress: start })
        ),
        ce(Text, { style: { marginTop: 8, fontSize: S.body, color: '#b8c2d3' } }, status),
        ce(View, { style: { flexDirection: 'row', marginTop: 12, marginBottom: 8 } },
          ce(View, { style: { width: 210, padding: 12, marginRight: 10, borderRadius: 12, backgroundColor: '#0f1217' } },
            ce(Text, { style: { fontSize: S.small, color: '#aab5c5' } }, 'SCORE'),
            ce(Text, { style: { marginTop: 4, fontSize: S.title, color: '#ffffff', fontWeight: 'bold' } }, String(game.score))),
          ce(View, { style: { width: 170, padding: 12, borderRadius: 12, backgroundColor: '#0f1217' } },
            ce(Text, { style: { fontSize: S.small, color: '#aab5c5' } }, 'LINES'),
            ce(Text, { style: { marginTop: 4, fontSize: S.title, color: '#ffffff', fontWeight: 'bold' } }, String(game.lines)))
        ),
        ce(View, { style: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' } },
          ce(Button, { label: game.running ? 'LEFT' : 'START', primary: true, onPress: game.running ? function () { move(-1); } : start }),
          ce(Button, { label: game.running ? 'ROTATE' : 'RESET', onPress: game.running ? turn : start }),
          ce(Button, { label: game.running ? 'RIGHT' : 'HOW TO PLAY', wide: true, onPress: game.running ? function () { move(1); } : start }),
          ce(Button, { label: 'DOWN', onPress: softDrop }),
          ce(Button, { label: 'DROP', primary: true, onPress: drop })
        ),
        ce(Text, { style: { marginTop: 8, fontSize: S.small, color: '#9da8b8' } }, 'On tile focus, press Up to reach START. Then use D-pad to focus an action and X to activate it.')
      )
    );
  }

  wh.register(Tetris);
})(globalThis.__wh);
