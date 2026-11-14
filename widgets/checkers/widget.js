// Checkers - American/English draughts vs the console. D-pad moves the
// cursor, X selects and moves, Square cancels. No import/require.
(function (wh) {
  var React = wh.React;
  var View = wh.View;
  var ce = React.createElement;
  var useState = React.useState;
  var useRef = React.useRef;
  var useEffect = React.useEffect;
  var FONT = wh.FontSize || {};
  var FS_BODY = FONT.Size3XSmall || 18;
  var FS_SMALL = FONT.Size4XSmall || 15;

  var RED = 1, BLACK = -1;

  function copyBoard(b) { return b.map(function (row) { return row.slice(); }); }
  function initialBoard() {
    var b = [], r, c;
    for (r = 0; r < 8; r++) b.push([0, 0, 0, 0, 0, 0, 0, 0]);
    for (r = 0; r < 3; r++) for (c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = BLACK;
    for (r = 5; r < 8; r++) for (c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = RED;
    return b;
  }
  function inside(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
  function isKing(p) { return p === 2 || p === -2; }
  function sideOf(p) { return p > 0 ? RED : (p < 0 ? BLACK : 0); }
  function dirsFor(p) {
    if (p === 2 || p === -2) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    if (p === 1) return [[-1, -1], [-1, 1]];
    return [[1, -1], [1, 1]];
  }
  function isCapturePath(path) {
    var i;
    for (i = 1; i < path.length; i++) {
      if (Math.abs(path[i][0] - path[i - 1][0]) === 2) return true;
    }
    return false;
  }
  function capturePaths(b, r, c) {
    var out = [];
    function walk(bb, cr, cc, path) {
      var p = bb[cr][cc], moved = false, ds = dirsFor(p), i;
      for (i = 0; i < ds.length; i++) {
        var mr = cr + ds[i][0], mc = cc + ds[i][1];
        var lr = cr + 2 * ds[i][0], lc = cc + 2 * ds[i][1];
        if (inside(lr, lc) && bb[lr][lc] === 0 && inside(mr, mc) && bb[mr][mc] !== 0 && sideOf(bb[mr][mc]) === -sideOf(p)) {
          var nb = copyBoard(bb);
          nb[lr][lc] = nb[cr][cc]; nb[cr][cc] = 0; nb[mr][mc] = 0;
          var promoted = false;
          if (!isKing(nb[lr][lc])) {
            if ((nb[lr][lc] === RED && lr === 0) || (nb[lr][lc] === BLACK && lr === 7)) {
              nb[lr][lc] = nb[lr][lc] > 0 ? 2 : -2;
              promoted = true;
            }
          }
          if (promoted) { out.push(path.concat([[lr, lc]])); }
          else { moved = true; walk(nb, lr, lc, path.concat([[lr, lc]])); }
        }
      }
      if (!moved && path.length > 1) out.push(path);
    }
    if (b[r][c] !== 0) walk(b, r, c, [[r, c]]);
    return out;
  }
  function simpleMoves(b, r, c) {
    var p = b[r][c], out = [], ds = dirsFor(p), i;
    for (i = 0; i < ds.length; i++) {
      var lr = r + ds[i][0], lc = c + ds[i][1];
      if (inside(lr, lc) && b[lr][lc] === 0) out.push([[r, c], [lr, lc]]);
    }
    return out;
  }
  function allMoves(b, side) {
    var caps = [], moves = [], r, c;
    for (r = 0; r < 8; r++) for (c = 0; c < 8; c++) {
      if (sideOf(b[r][c]) === side) caps = caps.concat(capturePaths(b, r, c));
    }
    if (caps.length) return caps;
    for (r = 0; r < 8; r++) for (c = 0; c < 8; c++) {
      if (sideOf(b[r][c]) === side) moves = moves.concat(simpleMoves(b, r, c));
    }
    return moves;
  }
  function applyPath(b, path) {
    var nb = copyBoard(b), i;
    for (i = 1; i < path.length; i++) {
      var fr = path[i - 1], to = path[i];
      nb[to[0]][to[1]] = nb[fr[0]][fr[1]]; nb[fr[0]][fr[1]] = 0;
      if (Math.abs(to[0] - fr[0]) === 2) nb[(fr[0] + to[0]) / 2][(fr[1] + to[1]) / 2] = 0;
      var q = nb[to[0]][to[1]];
      if (!isKing(q)) {
        if ((q === RED && to[0] === 0) || (q === BLACK && to[0] === 7)) nb[to[0]][to[1]] = q > 0 ? 2 : -2;
      }
    }
    return nb;
  }
  function countSide(b, side) {
    var n = 0, r, c;
    for (r = 0; r < 8; r++) for (c = 0; c < 8; c++) if (sideOf(b[r][c]) === side) n++;
    return n;
  }
  function evaluate(b) {
    var s = 0, r, c;
    for (r = 0; r < 8; r++) for (c = 0; c < 8; c++) {
      var p = b[r][c];
      if (!p) continue;
      var v = (isKing(p) ? 140 : 100) + (p < 0 ? r : (7 - r)) * 3 + ((c >= 2 && c <= 5) ? 4 : 0);
      s += p < 0 ? v : -v;
    }
    return s;
  }
  function negamax(b, side, depth) {
    var moves = allMoves(b, side);
    if (!moves.length) return { score: side === BLACK ? -100000 : 100000, path: null };
    if (depth === 0) {
      var e = evaluate(b);
      return { score: side === BLACK ? e : -e, path: moves[0] };
    }
    var best = null, i;
    for (i = 0; i < moves.length; i++) {
      var s = -negamax(applyPath(b, moves[i]), -side, depth - 1).score;
      if (best === null || s > best.score || (s === best.score && Math.random() < 0.15)) {
        best = { score: s, path: moves[i] };
      }
    }
    return best;
  }
  function cpuPick(b) {
    var res = negamax(b, BLACK, 3);
    return res.path;
  }

  function Btn(props) {
    var focusedPair = useState(false);
    var focused = focusedPair[0];
    var setFocused = focusedPair[1];
    return ce(View, {
      focusable: true,
      onFocus: function () { setFocused(true); },
      onBlur: function () { setFocused(false); },
      onPress: props.onPress,
      style: {
        height: 40, paddingHorizontal: 14, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: focused ? '#356ac4' : '#242932',
        borderWidth: focused ? 3 : 1, borderColor: focused ? '#ffffff' : '#424955'
      }
    }, ce(wh.Label, { style: { fontSize: FS_SMALL, fontWeight: 'bold' } }, props.label || 'Restart'));
  }

  function CheckerCell(props) {
    var focusedPair = useState(false);
    var focused = focusedPair[0];
    var setFocused = focusedPair[1];
    var r = props.r, c = props.c, piece = props.piece;
    var cellSize = props.cellSize || 54;
    var pieceSize = props.pieceSize || 42;
    var isSel = !!props.selected;
    var isDest = !!props.dest;
    var dark = (r + c) % 2 === 1;
    var inner = null;
    if (piece !== 0) {
      inner = ce(View, {
        style: {
          width: pieceSize, height: pieceSize, borderRadius: pieceSize / 2,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: piece > 0 ? '#ce4444' : '#232a3c',
          borderWidth: 2, borderColor: piece > 0 ? '#f0e6dc' : '#8fa3c8'
        }
      }, isKing(piece) ? ce(wh.Label, { style: { fontSize: FS_BODY, fontWeight: 'bold' } }, 'K') : null);
    } else if (isDest) {
      inner = ce(View, { style: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#7ee2a8' } });
    }
    return ce(View, {
      focusable: true,
      onFocus: function () { setFocused(true); },
      onBlur: function () { setFocused(false); },
      onPress: props.onPress,
      style: {
        width: cellSize, height: cellSize, alignItems: 'center', justifyContent: 'center',
        backgroundColor: dark ? '#1a2233' : '#e2e6f0',
        borderWidth: (isSel || focused) ? 3 : 0,
        borderColor: isSel ? '#35c4ff' : '#ffffff'
      }
    }, inner);
  }

  function piecePaths(b, r, c) {
    var caps = capturePaths(b, r, c);
    if (caps.length) return caps;
    var all = allMoves(b, sideOf(b[r][c]));
    if (all.length && isCapturePath(all[0])) return [];
    return simpleMoves(b, r, c);
  }

  function Checkers(props) {
    var cfg = (props && props.config) || {};
    var boardPair = useState(initialBoard);
    var board = boardPair[0];
    var setBoard = boardPair[1];
    var selPair = useState(null);
    var sel = selPair[0];
    var setSel = selPair[1];
    var pathsPair = useState([]);
    var paths = pathsPair[0];
    var setPaths = pathsPair[1];
    var turnPair = useState('player');
    var turn = turnPair[0];
    var setTurn = turnPair[1];
    var overPair = useState(null);
    var over = overPair[0];
    var setOver = overPair[1];
    var msgPair = useState('Red moves first. Good luck.');
    var message = msgPair[0];
    var setMessage = msgPair[1];
    var movesPair = useState(0);
    var moves = movesPair[0];
    var setMoves = movesPair[1];

    function endGame(nb, winner, msg) {
      setBoard(nb);
      setOver(winner);
      setTurn('over');
      setSel(null);
      setPaths([]);
      setMessage(msg);
    }
    function doPlayerMove(path) {
      var nb = applyPath(board, path);
      var nm = moves + 1;
      if (countSide(nb, BLACK) === 0) { endGame(nb, 'player', 'You take the last piece — you win!'); return; }
      if (!allMoves(nb, BLACK).length) { endGame(nb, 'player', 'CPU has no moves — you win!'); return; }
      setBoard(nb);
      setMoves(nm);
      setSel(null);
      setPaths([]);
      setTurn('cpu');
      setMessage('');
    }
    function pressCell(r, c) {
      if (over || turn !== 'player') return;
      if (sel && sel[0] === r && sel[1] === c) { setSel(null); setPaths([]); setMessage(''); return; }
      if (sel) {
        var i, hit = null;
        for (i = 0; i < paths.length; i++) {
          var e = paths[i][paths[i].length - 1];
          if (e[0] === r && e[1] === c) { hit = paths[i]; break; }
        }
        if (hit) { doPlayerMove(hit); return; }
      }
      if (sideOf(board[r][c]) === RED) {
        var mine = piecePaths(board, r, c);
        if (!mine.length) { setMessage('That piece cannot move — jumps are mandatory!'); return; }
        setSel([r, c]);
        setPaths(mine);
        setMessage('');
      } else {
        setSel(null);
        setPaths([]);
      }
    }
    if (wh.onPressed) {
      wh.onPressed('Square', function () {
        if (sel && !over && turn === 'player') { setSel(null); setPaths([]); setMessage(''); }
      });
    }
    useEffect(function () {
      if (turn !== 'cpu' || over) return;
      var t = setTimeout(function () {
        var p = cpuPick(board);
        if (!p) { endGame(board, 'player', 'CPU has no moves — you win!'); return; }
        var nb = applyPath(board, p);
        var nm = moves + 1;
        if (countSide(nb, RED) === 0) { endGame(nb, 'cpu', 'CPU takes your last piece — you lose.'); return; }
        if (!allMoves(nb, RED).length) { endGame(nb, 'cpu', 'No moves left — CPU wins.'); return; }
        if (nm >= 80) { endGame(nb, 'draw', 'Draw — 40 moves each.'); return; }
        setBoard(nb);
        setMoves(nm);
        setTurn('player');
      }, 450);
      return function () { clearTimeout(t); };
    }, [turn]);
    function newGame() {
      setBoard(initialBoard());
      setSel(null);
      setPaths([]);
      setTurn('player');
      setOver(null);
      setMoves(0);
      setMessage('Red moves first. Good luck.');
    }

    var W = (props && props.width) || 1032;
    var H = (props && props.height) || 504;
    var cellSize = Math.max(34, Math.floor(Math.min((W - 32) / 8, (H - 80) / 8)));
    var pieceSize = Math.floor(cellSize * 0.78);
    var destMap = {}, di;
    for (di = 0; di < paths.length; di++) {
      var de = paths[di][paths[di].length - 1];
      destMap[de[0] + ',' + de[1]] = 1;
    }
    var rows = [], r, c;
    for (r = 0; r < 8; r++) {
      var cells = [];
      for (c = 0; c < 8; c++) {
        (function (rr, cc) {
          cells.push(ce(CheckerCell, {
            key: 'cell-' + rr + '-' + cc, r: rr, c: cc,
            piece: board[rr][cc],
            cellSize: cellSize, pieceSize: pieceSize,
            selected: !!(sel && sel[0] === rr && sel[1] === cc),
            dest: !!destMap[rr + ',' + cc],
            onPress: function () { pressCell(rr, cc); }
          }));
        })(r, c);
      }
      rows.push(ce(View, { key: 'row-' + r, style: { flexDirection: 'row' } }, cells));
    }
    var redLeft = countSide(board, RED), blackLeft = countSide(board, BLACK);
    var badge = over ? (over === 'player' ? 'WIN' : (over === 'cpu' ? 'LOSS' : 'DRAW')) : (turn === 'player' ? 'YOU' : 'CPU');
    return ce(View, {
      style: { width: W, height: H, padding: 16, borderRadius: 16, backgroundColor: '#1b1d23' }
    },
      ce(View, { key: 'header', style: { flexDirection: 'row', alignItems: 'center' } },
        ce(wh.Title, { iconId: cfg.iconId || 'wh:checkers', style: { flex: 1 } }, cfg.title || 'Checkers'),
        ce(Btn, { label: 'Restart', onPress: newGame }),
        ce(wh.Label, { style: { fontSize: FS_SMALL, fontWeight: 'bold', marginLeft: 12, minWidth: 48, textAlign: 'right' } }, badge)
      ),
      ce(View, { key: 'body', style: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 8 } },
        ce(View, { key: 'board', style: { borderRadius: 8, overflow: 'hidden' } }, rows)
      )
    );
  }

  wh.register(Checkers);
})(globalThis.__wh);
