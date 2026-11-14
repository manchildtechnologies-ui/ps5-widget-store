(function (wh) {
  var React = wh.React, View = wh.View, Label = wh.Label, Image = wh.Image, ce = React.createElement;
  var F = wh.FontSizePS || { SizeNormal: 30, Size3XSmall: 18, Size4XSmall: 15 };
  var COLS = 12, ROWS = 10;
  function fresh() { return { bird: 4, pipes: [{ x: 8, gap: 4 }, { x: 13, gap: 6 }], score: 0, over: false, started: false, tick: 0 }; }
  function advance(g) {
    if (!g.started || g.over) return g;
    var bird = Math.min(ROWS - 1, g.bird + 1), pipes = g.pipes.map(function (p) { return { x: p.x - 1, gap: p.gap }; });
    var score = g.score, over = bird >= ROWS - 1;
    pipes.forEach(function (p) {
      if (p.x === 2) score++;
      if (p.x === 2 && (bird < p.gap - 1 || bird > p.gap + 1)) over = true;
    });
    if (pipes[0].x < -1) pipes.shift();
    if (!pipes.length || pipes[pipes.length - 1].x < 8) pipes.push({ x: COLS, gap: 2 + Math.floor(Math.random() * 6) });
    return { bird: bird, pipes: pipes, score: score, over: over, started: true, tick: g.tick + 1 };
  }
  function Flappy(props) {
    var pair = React.useState(fresh()), game = pair[0], setGame = pair[1];
    var ref = React.useRef(game); ref.current = game;
    React.useEffect(function () {
      var timer = setInterval(function () { setGame(function (g) { var n = advance(g); ref.current = n; return n; }); }, 430);
      return function () { clearInterval(timer); };
    }, []);
    function flap() {
      setGame(function (g) {
        if (g.over) { var n = fresh(); n.started = true; n.bird = 3; ref.current = n; return n; }
        var n = { bird: Math.max(0, g.bird - 2), pipes: g.pipes, score: g.score, over: false, started: true, tick: g.tick };
        ref.current = n; return n;
      });
    }
    var width = props.width || 504;
    var cellW = Math.floor((width - 48) / COLS), cellH = 34;
    var cfg = props.config || {}, assetBase = cfg.assetBase || '';
    var spriteWidth = Math.min(cellW - 4, 54), spriteHeight = 34;
    var rows = [];
    for (var y = 0; y < ROWS; y++) {
      var cells = [];
      for (var x = 0; x < COLS; x++) {
        cells.push(ce(View, { key: x, style: { width: cellW - 2, height: cellH - 2, margin: 1, borderRadius: 3, backgroundColor: (x + y) % 2 ? '#83d9df' : '#8be1e5' } }));
      }
      rows.push(ce(View, { key: y, style: { flexDirection: 'row', height: cellH } }, cells));
    }
    var obstacleImages = [];
    if (Image && assetBase) game.pipes.forEach(function (p) {
      if (p.x < 0 || p.x >= COLS) return;
      var topRows = Math.max(0, p.gap - 1), bottomStart = Math.min(ROWS, p.gap + 2);
      if (topRows > 0) obstacleImages.push(ce(Image, { key: 'pipe-top-' + p.x, source: { uri: assetBase + 'pipe.png' }, resizeMode: 'stretch', style: { position: 'absolute', left: p.x * cellW, top: 0, width: cellW, height: topRows * cellH, transform: [{ rotate: '180deg' }] } }));
      if (bottomStart < ROWS) obstacleImages.push(ce(Image, { key: 'pipe-bottom-' + p.x, source: { uri: assetBase + 'pipe.png' }, resizeMode: 'stretch', style: { position: 'absolute', left: p.x * cellW, top: bottomStart * cellH, width: cellW, height: (ROWS - bottomStart) * cellH } }));
    });
    var birdImage = Image && assetBase ? ce(Image, { source: { uri: assetBase + 'icon.png' }, resizeMode: 'contain', style: { position: 'absolute', left: 2 * cellW + (cellW - spriteWidth) / 2, top: game.bird * cellH + (cellH - spriteHeight) / 2, width: spriteWidth, height: spriteHeight } }) : null;
    var status = game.over ? 'GAME OVER  ·  SELECT RETRY' : (game.started ? 'PRESS FLAP TO RISE' : 'READY TO FLAP');
    return ce(View, { style: { width: width, height: props.height || 504, padding: 16, borderRadius: 18, backgroundColor: '#102b42', alignItems: 'center', overflow: 'hidden' } },
      ce(View, { style: { width: '100%', height: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } },
        ce(View, { style: { flexDirection: 'row', alignItems: 'center', flex: 1 } },
          Image && props.config && props.config.assetBase ? ce(Image, { source: { uri: props.config.assetBase + 'icon.png' }, resizeMode: 'contain', style: { width: 44, height: 44, marginRight: 10, borderRadius: 8 } }) : null,
          ce(wh.Title, { style: { flex: 1 } }, cfg.title || 'FLAP!')
        ),
        ce(wh.Focusable, { onPress: flap, style: { width: 52, height: 52, borderRadius: 9, backgroundColor: '#ffb83d', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffe898', marginHorizontal: 10 }, focusedStyle: { borderColor: '#ffffff', borderWidth: 3 } },
          ce(Label, { style: { fontSize: F.Size4XSmall, color: '#402d18', fontWeight: 'bold' } }, game.over ? 'RETRY' : 'FLAP')),
        ce(Label, { style: { fontSize: F.SizeNormal, color: '#ffe36a', fontWeight: 'bold' } }, String(game.score))
      ),
      ce(View, { style: { marginTop: 6, padding: 4, backgroundColor: '#6ac9d7', borderRadius: 10, borderWidth: 3, borderColor: '#d5f6ed' } },
        ce(View, { style: { width: COLS * cellW, height: ROWS * cellH, position: 'relative', overflow: 'hidden' } }, rows, obstacleImages, birdImage)
      ),
      ce(Label, { style: { marginTop: 8, fontSize: F.Size3XSmall, color: '#c8eff0', fontWeight: 'bold', textAlign: 'center' } }, status),
      ce(Label, { style: { marginTop: 5, fontSize: F.Size4XSmall, color: '#91c7d2' } }, 'D-PAD: SELECT  ·  X: FLAP')
    );
  }
  wh.register(Flappy);
})(globalThis.__wh);
