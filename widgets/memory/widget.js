// Memory Match - flip pairs and clear the board. D-pad moves, X flips.
// No import/require. Gets RN primitives from wh.
(function (wh) {
  var React = wh.React;
  var View = wh.View;
  var ce = React.createElement;
  var useState = React.useState;
  var useRef = React.useRef;
  var CARD = 106;

  var SYMBOLS = ['\u2605', '\u2665', '\u25cf', '\u25b2', '\u25a0', '\u2663', '\u2660', '\u2600'];

  function freshDeck() {
    var bag = [];
    var i;
    for (i = 0; i < 8; i++) { bag.push(i); bag.push(i); }
    for (i = bag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = bag[i]; bag[i] = bag[j]; bag[j] = t;
    }
    return bag.map(function (s) { return { s: s, up: false, done: false }; });
  }

  function MemCard(props) {
    var focusedPair = useState(false);
    var focused = focusedPair[0];
    var setFocused = focusedPair[1];
    var face = props.up || props.done;
    return ce(View, {
      focusable: true,
      onFocus: function () { setFocused(true); },
      onBlur: function () { setFocused(false); },
      onPress: props.onPress,
      style: {
        width: CARD, height: CARD, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: face ? '#e8ecf4' : (props.done ? '#1b1d23' : '#244b8b'),
        borderWidth: focused ? 3 : 1,
        borderColor: focused ? '#ffffff' : '#424955',
        opacity: props.done ? 0.35 : 1
      }
    }, face ? ce(wh.Label, { style: { fontSize: 54, fontWeight: 'bold', color: '#000000' } }, SYMBOLS[props.sym]) : ce(wh.Label, { style: { fontSize: 36, fontWeight: 'bold', color: '#ffffff' } }, '?'));
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
        width: 40, height: 40, paddingHorizontal: 0, marginTop: 0, marginLeft: 8, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: focused ? '#356ac4' : '#242932',
        borderWidth: focused ? 3 : 1, borderColor: focused ? '#ffffff' : '#424955'
      }
    }, ce(View, { style: { width: 23, height: 23, alignItems: 'center', justifyContent: 'center' } },
      ce(View, { style: { width: 17, height: 17, borderRadius: 9, borderWidth: 2, borderColor: '#ffffff', borderTopColor: 'transparent', transform: [{ rotate: '-45deg' }] } }),
      ce(View, { style: { position: 'absolute', top: 1, right: 0, width: 0, height: 0, borderTopWidth: 4, borderBottomWidth: 4, borderLeftWidth: 7, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#ffffff', transform: [{ rotate: '-45deg' }] } })
    ));
  }

  function Memory(props) {
    var cfg = (props && props.config) || {};
    var cardsPair = useState(freshDeck);
    var cards = cardsPair[0];
    var setCards = cardsPair[1];
    var firstPair = useState(null);
    var first = firstPair[0];
    var setFirst = firstPair[1];
    var lockRef = useRef(false);
    var wonPair = useState(false);
    var won = wonPair[0];
    var setWon = wonPair[1];

    function flip(i) {
      if (lockRef.current || won) return;
      var c = cards[i];
      if (!c || c.up || c.done) return;
      var next = cards.slice();
      next[i] = { s: c.s, up: true, done: false };
      if (first === null) {
        setFirst(i);
        setCards(next);
        return;
      }
      var a = first;
      setFirst(null);
      if (cards[a].s === c.s) {
        next[a] = { s: cards[a].s, up: true, done: true };
        next[i] = { s: c.s, up: true, done: true };
        setCards(next);
        var left = next.filter(function (x) { return !x.done; }).length;
        if (!left) {
          setWon(true);
        }
      } else {
        setCards(next);
        lockRef.current = true;
        setTimeout(function () {
          setCards(function (prev) {
            var back = prev.slice();
            back[a] = { s: prev[a].s, up: false, done: false };
            back[i] = { s: prev[i].s, up: false, done: false };
            return back;
          });
          lockRef.current = false;
        }, 900);
      }
    }
    function newGame() {
      setCards(freshDeck());
      setFirst(null);
      lockRef.current = false;
      setWon(false);
    }

    var W = (props && props.width) || 1032;
    var H = (props && props.height) || 504;
    var grid = [], r, c;
    for (r = 0; r < 4; r++) {
      var row = [];
      for (c = 0; c < 4; c++) {
        (function (idx) {
          row.push(ce(MemCard, {
            key: 'card-' + idx,
            sym: cards[idx].s, up: cards[idx].up, done: cards[idx].done,
            onPress: function () { flip(idx); }
          }));
        })(r * 4 + c);
      }
      grid.push(ce(View, { key: 'row-' + r, style: { flexDirection: 'row' } }, row));
    }
    var doneCount = cards.filter(function (x) { return x.done; }).length / 2;
    return ce(View, {
      style: { width: W, height: H, padding: 16, borderRadius: 16, backgroundColor: '#1b1d23' }
    },
      ce(View, { key: 'header', style: { flexDirection: 'row', alignItems: 'center' } },
        ce(wh.Title, { iconId: cfg.iconId || 'wh:memory', badge: doneCount + '/8', style: { flex: 1 } }, cfg.title || 'Memory Match'),
        ce(Btn, { onPress: newGame })
      ),
      ce(View, { key: 'body', style: { flex: 1, marginTop: 8, alignItems: 'center', justifyContent: 'center' } },
        ce(View, { key: 'grid' }, grid)
      )
    );
  }

  wh.register(Memory);
})(globalThis.__wh);
