(function (wh) {
  var React = wh.React;
  var View = wh.View;
  var Text = wh.Text;
  var ScrollView = wh.ScrollView || View;
  var ce = React.createElement;
  var C = { bg: '#0b1018', panel: '#121a25', panel2: '#192535', line: '#2a3a4d', white: '#f4f7fb', muted: '#9cabbc', cyan: '#68d9f5', gold: '#ffd27a' };
  var MAX_ITEMS = 100;

  function text(value, size, color, extra) {
    var style = { color: color || C.white, fontSize: size || 18 };
    if (extra) for (var key in extra) style[key] = extra[key];
    return ce(Text, { style: style }, value == null ? '' : String(value));
  }
  function dateLabel(value) {
    if (!value) return 'DATE UNKNOWN';
    var d = new Date(value.length === 10 ? value + 'T12:00:00Z' : value);
    if (isNaN(d.getTime())) return String(value).slice(0, 10);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
  }
  function clean(value, max) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max || 1200); }

  function HeadlineRow(props) {
    var focusedPair = React.useState(false);
    var focused = focusedPair[0];
    var setFocused = focusedPair[1];
    var item = props.item, active = props.active;
    return ce(View, {
      focusable: true,
      onFocus: function () { setFocused(true); props.onFocusItem(item); },
      onBlur: function () { setFocused(false); },
      onPress: props.onPress,
      style: { minHeight: 58, padding: 7, marginBottom: 5, borderRadius: 9,
        backgroundColor: active ? '#173345' : C.panel2,
        borderWidth: (active || focused) ? 2 : 1,
        borderColor: focused ? '#ffffff' : (active ? C.cyan : C.line) }
    },
      ce(View, null,
        ce(View, { style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 } }, text(item.kind.toUpperCase(), 15, item.kind === 'Release' ? C.gold : C.cyan, { fontWeight: 'bold' }), text(dateLabel(item.date), 15, C.muted)),
        text(clean(item.title, 100), 18, C.white, { fontWeight: active ? 'bold' : 'normal' })
      )
    );
  }

  function SceneWire(props) {
    var cfg = props.config || {};
    var pagePair = React.useState('list'), page = pagePair[0], setPage = pagePair[1];
    var selectedPair = React.useState(''), selectedId = selectedPair[0], setSelectedId = selectedPair[1];
    var browserStatusPair = React.useState(''), browserStatus = browserStatusPair[0], setBrowserStatus = browserStatusPair[1];
    var dataPair = React.useState({ loading: true, error: '', items: [], updated: '' }), data = dataPair[0], setData = dataPair[1];
    var activeRef = React.useRef(true);

    function loadFeeds() {
      setData(function (old) { return { loading: true, error: '', items: old.items || [], updated: old.updated || '' }; });
      var storiesUrl = typeof cfg.storiesUrl === 'string' ? cfg.storiesUrl : 'https://ps5-scene-wire.vercel.app/data/stories.json';
      var releasesUrl = typeof cfg.releasesUrl === 'string' ? cfg.releasesUrl : 'https://ps5-scene-wire.vercel.app/api/releases';
      Promise.all([
        fetch(storiesUrl, { headers: { Accept: 'application/json' } }).then(function (r) { if (!r || !r.ok) throw new Error('Stories feed HTTP ' + (r && r.status || '?')); return r.json(); }),
        fetch(releasesUrl, { headers: { Accept: 'application/json' } }).then(function (r) { if (!r || !r.ok) throw new Error('Release feed HTTP ' + (r && r.status || '?')); return r.json(); })
      ]).then(function (result) {
        var stories = Array.isArray(result[0]) ? result[0] : [];
        var apps = result[1] && Array.isArray(result[1].apps) ? result[1].apps : [];
        var items = [];
        stories.forEach(function (item) {
          if (!item || !item.title) return;
          items.push({ id: 'story:' + String(item.id || item.title), kind: 'Story', date: item.date || '', title: item.title, tag: item.tag || 'News', summary: item.summary || '', body: Array.isArray(item.body) ? item.body : [], sources: Array.isArray(item.sources) ? item.sources : [] });
        });
        apps.forEach(function (app) {
          if (!app || !app.name || !app.latest || !app.latest.date) return;
          items.push({ id: 'release:' + String(app.repo || app.name), kind: 'Release', date: app.latest.date, title: app.name + (app.latest.tag ? ' · ' + app.latest.tag : ''), tag: app.about || app.cat || 'App release', summary: app.about || 'New release available.', body: [app.about || '', 'Repository: ' + String(app.repo || app.name)], sources: [{ name: 'Release page', url: app.latest.url || app.releasesUrl || app.repoUrl || '' }] });
        });
        items.sort(function (a, b) { return new Date(b.date).getTime() - new Date(a.date).getTime(); });
        items = items.slice(0, MAX_ITEMS);
        if (activeRef.current) {
          setData({ loading: false, error: '', items: items, updated: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) });
          setSelectedId(function (oldId) { return items.some(function (item) { return item.id === oldId; }) ? oldId : (items[0] ? items[0].id : ''); });
        }
      }).catch(function (err) {
        if (activeRef.current) setData(function (old) { return { loading: false, error: clean(err && err.message || 'Could not load feeds.', 100), items: old.items || [], updated: old.updated || '' }; });
      });
    }

    React.useEffect(function () {
      activeRef.current = true;
      loadFeeds();
      var timer = setInterval(loadFeeds, 15 * 60 * 1000);
      return function () { activeRef.current = false; clearInterval(timer); };
    }, []);
    wh.onPressed(wh.Button.Square, function () { loadFeeds(); });
    var visible = data.items.filter(function (item) { return item.kind === 'Story'; });
    var selectedIndex = -1;
    for (var i = 0; i < visible.length; i++) if (visible[i].id === selectedId) { selectedIndex = i; break; }
    if (selectedIndex < 0 && visible.length) selectedIndex = 0;
    var selected = selectedIndex >= 0 ? visible[selectedIndex] : null;

    function backToHeadlines() { setPage('list'); }
    function openItemInBrowser(item) {
      if (!item) return false;
      var sources = Array.isArray(item.sources) ? item.sources : [];
      var source = sources.filter(function (entry) { return entry && typeof entry.url === 'string' && entry.url; })[0];
      var url = item.kind === 'Story'
        ? 'https://ps5-scene-wire.vercel.app/#' + encodeURIComponent(String(item.id || '').replace(/^story:/, ''))
        : (source ? source.url : '');
      if (!/^https:\/\/[^\s]+$/i.test(url)) { setBrowserStatus('No web page is available for this item.'); return true; }
      setBrowserStatus('Opening in the PS5 browser…');
      fetch('http://127.0.0.1:8098/__browser?url=' + encodeURIComponent(url)).then(function (response) {
        if (!response || !response.ok) throw new Error('The browser bridge refused this link.');
        return response.json();
      }).then(function (result) {
        if (!result || !result.ok) throw new Error(result && result.error || 'The PS5 browser did not open.');
        setBrowserStatus('Opened in the PS5 browser. Press Circle to return.');
        wh.log('opened browser for ' + item.kind.toLowerCase() + ': ' + clean(item.title, 100));
      }).catch(function (error) {
        setBrowserStatus('Could not open page: ' + clean(error && error.message || error, 140));
      });
      return true;
    }
    function stepStory(direction) {
      if (!visible.length || selectedIndex < 0) return false;
      var nextIndex = (selectedIndex + direction + visible.length) % visible.length;
      setSelectedId(visible[nextIndex].id);
      return true;
    }
    wh.onPressed(wh.Button.L1, function () {
      if (page === 'story') backToHeadlines();
      else stepStory(-1);
    });
    wh.onPressed(wh.Button.R1, function () {
      stepStory(1);
    });
    function openSelectedStory() {
      if (page !== 'list' || !selected) return false;
      setPage('story');
      return openItemInBrowser(selected);
    }
    React.useEffect(function () {
      if (page === 'story' && selected) wh.log('story screen rendered: ' + clean(selected.title, 100));
    }, [page, selectedId]);

    var header = ce(View, { style: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 8 } },
      ce(View, { style: { flexDirection: 'row', alignItems: 'center' } },
        ce(wh.IconPS, { iconId: 'wh:ps5-scene-wire', style: { width: 38, height: 38, marginRight: 8 } }),
        ce(View, null, text('PS5 NEWS', 21, C.white, { fontWeight: 'bold' }), text(page === 'story' ? 'FULL STORY' : 'LATEST STORIES', 15, C.muted, { marginTop: 1 }))
      ),
      text(data.loading ? 'SYNC' : String(visible.length) + ' ITEMS', 15, C.cyan, { fontWeight: 'bold' })
    );

    var mainContent;
    if (page === 'story' && selected) {
      mainContent = ce(View, { style: { flex: 1 } },
        ce(View, { style: { height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 7 } },
          text('L1  BACK TO HEADLINES', 15, C.cyan, { fontWeight: 'bold' }),
          text((selectedIndex + 1) + ' / ' + visible.length + '     R1  NEXT', 15, C.muted)
        ),
        ce(ScrollView, { key: 'story-' + selected.id, style: { flex: 1 }, scrollEnabled: true, nestedScrollEnabled: true, showsVerticalScrollIndicator: true },
          text(selected.kind.toUpperCase() + '  /  ' + dateLabel(selected.date), 15, C.cyan, { fontWeight: 'bold', marginBottom: 7 }),
          text(clean(selected.title, 220), 24, C.white, { fontWeight: 'bold', marginBottom: 9 }),
          text(clean(selected.tag, 150), 15, C.gold, { marginBottom: 9 }),
          text(clean(selected.summary, 900), 18, C.white, { lineHeight: 25, marginBottom: 12 }),
          (selected.body || []).map(function (paragraph, index) { return ce(Text, { key: 'body-' + index, style: { color: C.white, fontSize: 18, lineHeight: 25, marginBottom: 12 } }, clean(paragraph, 2400)); }),
          (selected.sources || []).filter(function (source) { return source && source.url; }).map(function (source, index) { return ce(View, { key: 'source-' + index, style: { paddingTop: 9, marginTop: 5, borderTopWidth: 1, borderTopColor: C.line } }, text('SOURCE', 15, C.muted, { fontWeight: 'bold' }), text(clean(source.name || source.url, 150), 15, C.cyan, { marginTop: 4 }), text(clean(source.url, 220), 15, C.muted, { marginTop: 3 })); })
        ),
        browserStatus ? text(browserStatus, 15, C.gold, { marginTop: 6 }) : null,
        ce(wh.Focusable, { onPress: function () { return openItemInBrowser(selected); }, style: { minHeight: 48, marginTop: 7, justifyContent: 'center', alignItems: 'center', borderRadius: 9, backgroundColor: '#15394a', borderWidth: 1, borderColor: C.cyan }, focusedStyle: { borderColor: C.white, borderWidth: 2 } }, text('OPEN IN BROWSER', 18, C.cyan, { fontWeight: 'bold' }))
      );
    } else {
      var windowSize = 4;
      var windowStart = Math.max(0, Math.min(selectedIndex - 1, visible.length - windowSize));
      var rows = visible.slice(windowStart, windowStart + windowSize).map(function (item) {
        var active = selected && item.id === selected.id;
        return ce(HeadlineRow, { key: item.id, item: item, active: active,
          onFocusItem: function (it) { setSelectedId(it.id); },
          onPress: function () { setSelectedId(item.id); setPage('story'); setBrowserStatus(''); openItemInBrowser(item); } });
      });
      mainContent = ce(View, { style: { flex: 1 } },
        ce(View, { style: { height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 5, position: 'relative' } },
          text('L1 / R1  CHOOSE HEADLINE', 15, C.cyan, { fontWeight: 'bold', textAlign: 'center' }),
          ce(View, { style: { position: 'absolute', right: 0 } }, text(selected ? (selectedIndex + 1) + ' / ' + visible.length : 'LOADING', 15, C.muted))
        ),
        rows.length ? rows : [text(data.error || (data.loading ? 'Fetching feeds…' : 'No news found.'), 18, data.error ? C.gold : C.muted)]
      );
    }
    var mainPanel = ce(View, { style: { flex: 1, minHeight: 0, padding: 9, borderRadius: 12, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line } }, mainContent);
    var content = ce(View, { style: { flex: 1 } },
      mainPanel
    );

    return ce(View, { style: { width: props.width || 504, height: props.height || 504, padding: 14, borderRadius: 16, backgroundColor: C.bg } },
      header,
      content
    );
  }
  wh.register(SceneWire);
})(globalThis.__wh);
