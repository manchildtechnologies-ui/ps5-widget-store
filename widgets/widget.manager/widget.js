// Widget Manager - uninstall installed widgets from inside the hub.
// Drop-in Welcome Hub widget. No import/require. Gets RN primitives from wh.
(function (wh) {
  var React = wh.React;
  var View = wh.View;
  var ce = React.createElement;
  var useState = React.useState;
  var useRef = React.useRef;
  var G = globalThis;
  var FONT = wh.FontSize || {};
  var FS_BODY = FONT.Size3XSmall || 18;
  var FS_SMALL = FONT.Size4XSmall || 15;

  var DEL_URL = 'http://127.0.0.1:8098/__delete?w=';

  function widgetIds() {
    var order = (G && G.__wh_order) || [];
    return order.slice();
  }
  function widgetTitle(id) {
    var cfgs = (G && G.__wh_cfgs) || {};
    var cfg = cfgs[id] || {};
    return cfg.title || id;
  }
  function widgetIconId(id) {
    var cfgs = (G && G.__wh_cfgs) || {};
    var cfg = cfgs[id] || {};
    if (cfg.glyph) return 'wh:' + id;
    return cfg.iconId || cfg.iconFallback || 'app_welcome';
  }

  function Row(props) {
    var focusedPair = useState(false);
    var focused = focusedPair[0];
    var setFocused = focusedPair[1];
    var right = props.gone ? 'UNINSTALLED' : 'UNINSTALL';
    var px = Math.max(18, Math.min(32, (props.height || 40) - 8));
    var icon = (wh.IconPS && props.iconId) ? ce(wh.IconPS, {
      iconId: props.iconId, style: { width: px, height: px, marginRight: 8 }
    }) : null;
    return ce(View, {
      focusable: true,
      onFocus: function () { setFocused(true); },
      onBlur: function () { setFocused(false); },
      onPress: props.onPress,
      style: {
        flexDirection: 'row',
        alignItems: 'center',
        height: props.height || 40,
        marginTop: 6,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: focused ? '#356ac4' : '#242932',
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? '#ffffff' : '#424955',
        opacity: props.gone ? 0.45 : 1
      }
    },
      icon,
      ce(wh.Label, { style: { flex: 1, fontSize: FS_BODY }, numberOfLines: 1 },
        props.title + '  (' + props.id + ')'),
      ce(wh.Label, { style: { fontSize: FS_SMALL, fontWeight: 'bold' } }, right));
  }

  function MiniButton(props) {
    var focusedPair = useState(false);
    var focused = focusedPair[0];
    var setFocused = focusedPair[1];
    return ce(View, {
      focusable: true,
      onFocus: function () { setFocused(true); },
      onBlur: function () { setFocused(false); },
      onPress: props.onPress,
      style: {
        height: 36,
        paddingHorizontal: 12,
        marginLeft: 8,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? '#356ac4' : '#244b8b',
        borderWidth: focused ? 2 : 1,
        borderColor: focused ? '#ffffff' : '#424955'
      }
    }, ce(wh.Label, { style: { fontSize: FS_SMALL, fontWeight: 'bold' } }, props.label));
  }

  function DialogKeys(props) {
    wh.onPressed('Enter', props.onYes);
    wh.onPressed('Square', props.onNo);
    return null;
  }

  function WidgetManager(props) {
    var cfg = (props && props.config) || {};
    var W = (props && props.width) || 504;
    var H = (props && props.height) || 328;
    var list = widgetIds();
    var pagePair = useState(0);
    var page = pagePair[0];
    var setPage = pagePair[1];
    var pageSize = 8;
    var pageCount = Math.max(1, Math.ceil(list.length / pageSize));
    var visiblePage = Math.min(page, pageCount - 1);
    var messagePair = useState('');
    var message = messagePair[0];
    var setMessage = messagePair[1];
    var confirmPair = useState(null);
    var confirmId = confirmPair[0];
    var setConfirm = confirmPair[1];
    var gonePair = useState({});
    var gone = gonePair[0];
    var setGone = gonePair[1];
    var busy = useRef(false);

    function changePage(delta) {
      if (pageCount <= 1) return true;
      var next = (visiblePage + delta + pageCount) % pageCount;
      setPage(next);
      setConfirm(null);
      setMessage('Page ' + (next + 1) + ' of ' + pageCount);
      return true;
    }
    wh.onPressed(wh.Button.L1, function () { return changePage(-1); });
    wh.onPressed(wh.Button.R1, function () { return changePage(1); });

    function press(id) {
      if (gone[id]) return;
      setConfirm(id);
      setMessage('');
    }

    function doDelete(id) {
      setConfirm(null);
      if (busy.current) return;
      busy.current = true;
      setMessage('Uninstalling ' + id + '...');
      try {
        fetch(DEL_URL + id, { method: 'POST' })
          .then(function (r) {
            return r.text().then(function (t) {
              return { code: r.status, ok: r.status === 200, body: t };
            });
          })
          .then(function (res) {
            busy.current = false;
            var parsed = null;
            try { parsed = JSON.parse(res.body); } catch (e) { parsed = null; }
            if (res.ok && parsed && parsed.ok) {
              var g = {};
              for (var k in gone) g[k] = gone[k];
              g[id] = 1;
              setGone(g);
              setMessage('Uninstalled ' + id + ' — press REFRESH HUB.');
            } else {
              setMessage('Uninstall failed (' + res.code + '): ' +
                String((parsed && parsed.error) || res.body || '?').slice(0, 60));
            }
          })
          .catch(function (e) {
            busy.current = false;
            setMessage('Uninstall failed: ' + ((e && e.message) || 'network'));
          });
      } catch (e) {
        busy.current = false;
        setMessage('Uninstall failed: ' + ((e && e.message) || 'request'));
      }
    }

    function bounce() {
      if (busy.current) return;
      busy.current = true;
      setConfirm(null);
      setMessage('Reopening hub…');
      try {
        fetch('http://127.0.0.1:8098/__launch?action=homehub')
          .then(function (r) {
            return r.text().then(function (t) {
              return { code: r.status, ok: r.status === 200, body: t };
            });
          })
          .then(function (res) {
            busy.current = false;
            var parsed = null;
            try { parsed = JSON.parse(res.body); } catch (e) { parsed = null; }
            if (res.ok && parsed && parsed.ok) {
              setMessage('Hub reopen requested — watch for a rebuild.');
            } else {
              setMessage('Refresh failed (' + res.code + ').');
            }
          })
          .catch(function (e) {
            busy.current = false;
            setMessage('Refresh failed: ' + ((e && e.message) || 'network'));
          });
      } catch (e) {
        busy.current = false;
        setMessage('Refresh failed: ' + ((e && e.message) || 'request'));
      }
    }

    var avail = H - 32 - 40 - 32 - 10;
    var gap = 6;
    var visibleCount = Math.max(1, Math.min(pageSize, list.length));
    var rowH = Math.max(18, Math.min(40, Math.floor(avail / visibleCount) - gap));
    var shown = list.slice(visiblePage * pageSize, (visiblePage + 1) * pageSize);
    var rows = [];
    for (var i = 0; i < shown.length; i++) {
      (function (id) {
        rows.push(ce(Row, {
          key: id, id: id, title: widgetTitle(id), height: rowH, iconId: widgetIconId(id),
          gone: !!gone[id],
          onPress: function () { press(id); }
        }));
      })(shown[i]);
    }
    var statusLine = message || (pageCount > 1 ? 'L1 / R1  CHANGE PAGE' : '');
    var dialog = confirmId ? ce(View, {
      key: 'confirm',
      style: { position: 'absolute', left: 0, top: 0, width: W, height: H, zIndex: 50, alignItems: 'center', justifyContent: 'center' }
    },
      ce(View, { key: 'dim', style: { position: 'absolute', left: 0, top: 0, width: W, height: H, backgroundColor: '#000000', opacity: 0.7 } }),
      ce(View, { key: 'box', style: { width: 380, padding: 16, borderRadius: 16, backgroundColor: '#242932', borderWidth: 2, borderColor: '#ffffff', alignItems: 'center' } },
        ce(wh.Label, { style: { fontSize: FS_BODY, fontWeight: 'bold' } }, 'Uninstall this widget?'),
        ce(wh.Label, { style: { fontSize: FS_SMALL, marginTop: 4 }, numberOfLines: 2 },
          widgetTitle(confirmId) + '  (' + confirmId + ')'),
        ce(wh.Label, { style: { fontSize: FS_SMALL, opacity: 0.6 }, numberOfLines: 1 }, 'X YES  ·  Square NO'),
        ce(View, { key: 'yn', style: { flexDirection: 'row', marginTop: 10 } },
          ce(MiniButton, { label: 'YES', onPress: function () { doDelete(confirmId); } }),
          ce(MiniButton, { label: 'NO', onPress: function () { setConfirm(null); } })),
      ce(DialogKeys, {
        key: 'keys',
        onYes: function () { doDelete(confirmId); },
        onNo: function () { setConfirm(null); }
      })
      )
    ) : null;
    return ce(View, {
      style: { width: W, height: H, padding: 16, borderRadius: 16, backgroundColor: '#1b1d23' }
    },
      ce(View, { key: 'head', style: { height: 40, flexDirection: 'row', alignItems: 'center' } },
        wh.IconPS ? ce(wh.IconPS, { iconId: cfg.iconId || 'wh:widget.manager', style: { width: 28, height: 28, marginRight: 8 } }) : null,
        ce(wh.Label, { style: { flex: 1, fontSize: FS_BODY, fontWeight: 'bold' }, numberOfLines: 1 },
          cfg.title || 'Widget Manager'),
        ce(MiniButton, { label: 'REFRESH HUB', onPress: bounce }),
        ce(wh.Label, { style: { minWidth: 38, marginLeft: 8, fontSize: FS_SMALL, textAlign: 'right', fontWeight: 'bold' }, numberOfLines: 1 },
          (visiblePage + 1) + ' / ' + pageCount)),
      ce(View, { key: 'rows', style: { marginTop: 10 } }, rows),
      ce(View, { key: 'foot', style: { flexDirection: 'row', alignItems: 'center', height: 32 } },
        ce(wh.Label, { style: { flex: 1, fontSize: FS_SMALL }, numberOfLines: 1 }, statusLine)),
      dialog
    );
  }

  wh.register(WidgetManager);
})(globalThis.__wh);
