// PS5 Reddit - new posts from r/ps5homebrew and r/PS5_Jailbreak in one tile.
// Reddit blocks requests without a real User-Agent, so one is always sent.
(function (wh) {
  var React = wh.React;
  var View = wh.View;
  var Text = wh.Text;
  var ce = React.createElement;
  var log = wh.logger ? wh.logger('vintendo.reddit-ps5') : function () {};
  var FONT = wh.FontSize || {};
  var FS_BODY = FONT.Size3XSmall || 18;
  var FS_SMALL = FONT.Size4XSmall || 15;
  var SUBS = ['ps5homebrew', 'PS5_Jailbreak'];
  var LIMIT = 20;
  var REFRESH_MS = 15 * 60 * 1000;
  var REQUEST_TIMEOUT_MS = 10000;
  var WINDOW_SIZE = 5;
  var UA = 'ps5-hub-widget/1.0 (welcome-hub tile reader)';

  function clean(value, max) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max || 140); }

  function ageLabel(utc) {
    var t = (Number(utc) || 0) * 1000;
    if (!t) return '';
    var mins = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (mins < 60) return mins + 'm ago';
    var hours = Math.round(mins / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.round(hours / 24) + 'd ago';
  }

  function fetchJson(url, useUA) {
    var headers = { Accept: 'application/json' };
    if (useUA) headers['User-Agent'] = UA;
    var request = fetch(url, { headers: headers }).then(function (response) {
      if (!response || !response.ok) throw new Error('HTTP ' + (response && response.status || 'no response'));
      return response.json();
    });
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error('Reddit request timed out'));
      }, REQUEST_TIMEOUT_MS);
      request.then(function (data) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(data);
      }, function (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  function postsFrom(sub, json) {
    var out = [];
    var children = json && json.data && json.data.children;
    if (Object.prototype.toString.call(children) !== '[object Array]') return out;
    for (var i = 0; i < children.length; i++) {
      var p = children[i] && children[i].data;
      if (!p || !p.title || !p.permalink) continue;
      out.push({
        id: 'rd:' + String(p.name || (sub + i)),
        title: clean(p.title, 140),
        sub: 'r/' + (p.subreddit || sub),
        link: 'https://www.reddit.com' + p.permalink,
        score: typeof p.score === 'number' ? p.score : 0,
        comments: typeof p.num_comments === 'number' ? p.num_comments : 0,
        age: ageLabel(p.created_utc),
        stamp: Number(p.created_utc) || 0,
        snippet: clean(p.selftext, 120)
      });
    }
    return out;
  }

  function postsFromArctic(sub, json) {
    var out = [];
    var list = null;
    if (json && typeof json === 'object') {
      try { log('arctic keys: ' + Object.getOwnPropertyNames(json).join(',')); } catch (e) {}
      for (var k in json) {
        if (json[k] && Object.prototype.toString.call(json[k]) === '[object Array]' && json[k].length) { list = json[k]; break; }
      }
    }
    if (!list) return out;
    for (var i = 0; i < list.length; i++) {
      var p = list[i] || {};
      var title = clean(p.title || p.name, 140);
      var link = p.permalink ? 'https://www.reddit.com' + p.permalink : clean(p.url || p.link, 300);
      if (!title || !/^https:\/\//i.test(link)) continue;
      var stamp = Number(p.created_utc || p.createdAt || p.created || p.timestamp) || 0;
      if (stamp < 10000000000) stamp = stamp * 1000;
      out.push({
        id: 'rd:' + String(p.id || p.name || (sub + i)),
        title: title,
        sub: 'r/' + (p.subreddit || sub),
        link: link,
        score: typeof p.score === 'number' ? p.score : (typeof p.upvotes === 'number' ? p.upvotes : 0),
        comments: typeof p.num_comments === 'number' ? p.num_comments : (typeof p.numComments === 'number' ? p.numComments : 0),
        age: ageLabel(stamp / 1000),
        stamp: stamp,
        snippet: clean(p.selftext || p.body || p.selfText, 120)
      });
    }
    return out;
  }

  var ROUTES = [
    { label: 'reddit-noua', kind: 'reddit', useUA: false, url: function (s) { return 'https://www.reddit.com/r/' + s + '/new/.json?limit=' + LIMIT + '&raw_json=1'; } },
    { label: 'old-noua', kind: 'reddit', useUA: false, url: function (s) { return 'https://old.reddit.com/r/' + s + '/new/.json?limit=' + LIMIT + '&raw_json=1'; } },
    { label: 'old-ua', kind: 'reddit', useUA: true, url: function (s) { return 'https://old.reddit.com/r/' + s + '/new/.json?limit=' + LIMIT + '&raw_json=1'; } },
    { label: 'redlib', kind: 'reddit', useUA: true, url: function (s) { return 'https://redlib.catsarch.com/r/' + s + '/new.json?limit=' + LIMIT + '&raw_json=1'; } },
    { label: 'arctic', kind: 'arctic', useUA: true, url: function (s) { return 'https://arctic-shift.com/api/posts/search?subreddit=' + s + '&limit=' + LIMIT + '&sort=desc'; } }
  ];

  function attempt(sub, i) {
    if (i >= ROUTES.length) return Promise.resolve({ sub: sub, items: [], error: 'all routes refused' });
    var route = ROUTES[i];
    return fetchJson(route.url(sub), route.useUA).then(function (json) {
      var items = route.kind === 'arctic' ? postsFromArctic(sub, json) : postsFrom(sub, json);
      if (!items.length) throw new Error('empty (' + route.label + ')');
      log('r/' + sub + ' ok via ' + route.label + ': ' + items.length + ' posts');
      return { sub: sub, items: items, error: '' };
    }).catch(function (error) {
      log('r/' + sub + ' ' + route.label + ' failed: ' + clean(error && error.message || error, 80));
      return attempt(sub, i + 1);
    });
  }

  function loadSubs() {
    return Promise.all(SUBS.map(function (sub) {
      log('fetching r/' + sub);
      return attempt(sub, 0);
    }));
  }

  function Row(props) {
    var focusedPair = React.useState(false);
    var focused = focusedPair[0];
    var setFocused = focusedPair[1];
    var item = props.item;
    var active = props.active;
    return ce(View, {
      focusable: true,
      onFocus: function () { setFocused(true); props.onFocusItem(item); },
      onBlur: function () { setFocused(false); },
      onPress: props.onPress,
      style: { minHeight: 60, padding: 8, marginBottom: 6, borderRadius: 9,
        backgroundColor: active ? '#173345' : '#192535',
        borderWidth: (active || focused) ? 2 : 1,
        borderColor: focused ? '#ffffff' : (active ? '#68d9f5' : '#2a3a4d') }
    },
      ce(View, { style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 } },
        ce(Text, { style: { fontSize: FS_SMALL, color: '#ffd27a', fontWeight: 'bold' }, numberOfLines: 1 }, item.sub),
        ce(Text, { style: { fontSize: FS_SMALL, color: '#9cabbc' } }, item.score + ' pts  -  ' + item.comments + ' comments  -  ' + item.age)),
      ce(Text, { style: { fontSize: FS_BODY, color: '#f4f7fb', fontWeight: active ? 'bold' : 'normal' }, numberOfLines: 2 }, item.title),
      item.snippet ? ce(Text, { style: { fontSize: FS_SMALL, color: '#9cabbc', marginTop: 2 }, numberOfLines: 1 }, item.snippet) : null
    );
  }

  function Reddit(props) {
    var cfg = (props && props.config) || {};
    var dataPair = React.useState({ loading: true, error: '', items: [] });
    var data = dataPair[0];
    var setData = dataPair[1];
    var selectedPair = React.useState('');
    var selectedId = selectedPair[0];
    var setSelectedId = selectedPair[1];
    var statusPair = React.useState('');
    var browserStatus = statusPair[0];
    var setBrowserStatus = statusPair[1];
    var activeRef = React.useRef(true);

    function load() {
      setData(function (old) { return { loading: true, error: '', items: old.items || [] }; });
      loadSubs().then(function (results) {
        var merged = [];
        var errors = [];
        for (var r = 0; r < results.length; r++) {
          merged = merged.concat(results[r].items);
          if (results[r].error) errors.push('r/' + results[r].sub + ': ' + results[r].error);
        }
        merged.sort(function (a, b) { return b.stamp - a.stamp; });
        if (!merged.length && !activeRef.current) return;
        if (activeRef.current) {
          setData({ loading: false, error: errors.join('  |  '), items: merged });
          setSelectedId(function (oldId) { return merged.some(function (it) { return it.id === oldId; }) ? oldId : (merged[0] ? merged[0].id : ''); });
        }
      });
    }

    React.useEffect(function () {
      activeRef.current = true;
      load();
      var timer = setInterval(load, REFRESH_MS);
      return function () { activeRef.current = false; clearInterval(timer); };
    }, []);

    var visible = data.items;
    var selectedIndex = -1;
    for (var i = 0; i < visible.length; i++) if (visible[i].id === selectedId) { selectedIndex = i; break; }
    if (selectedIndex < 0 && visible.length) selectedIndex = 0;
    var selected = selectedIndex >= 0 ? visible[selectedIndex] : null;

    function step(direction) {
      if (!visible.length || selectedIndex < 0) return false;
      setSelectedId(visible[(selectedIndex + direction + visible.length) % visible.length].id);
      return true;
    }

    function openInBrowser(item) {
      if (!item || !/^https?:\/\/\S+$/i.test(item.link)) { setBrowserStatus('No web page is available for this item.'); return true; }
      setBrowserStatus('Opening in the PS5 browser...');
      log('browser open attempt r/' + item.sub);
      fetch('http://127.0.0.1:8098/__browser?url=' + encodeURIComponent(item.link)).then(function (response) {
        if (!response || !response.ok) throw new Error('The browser bridge refused this link (HTTP ' + (response && response.status || 'none') + ').');
        return response.json();
      }).then(function (result) {
        if (!result || !result.ok) throw new Error(result && result.error || 'The PS5 browser did not open.');
        setBrowserStatus('Opened in the PS5 browser. Press Circle to return.');
      }).catch(function (error) {
        setBrowserStatus('Could not open page: ' + clean(error && error.message || error, 140));
        log('browser open failed ' + clean(error && error.message || error, 120));
      });
      return true;
    }

    wh.onPressed(wh.Button.Square, function () { load(); });
    wh.onPressed(wh.Button.L1, function () { step(-1); });
    wh.onPressed(wh.Button.R1, function () { step(1); });

    var windowStart = Math.max(0, Math.min(selectedIndex - 1, visible.length - WINDOW_SIZE));
    var rows = visible.slice(windowStart, windowStart + WINDOW_SIZE).map(function (item) {
      return ce(Row, { key: item.id, item: item, active: selected && item.id === selected.id,
        onFocusItem: function (it) { setSelectedId(it.id); },
        onPress: function () { setSelectedId(item.id); setBrowserStatus(''); openInBrowser(item); } });
    });

    return ce(View, { style: { width: props.width || 504, height: props.height || 504, padding: 14, borderRadius: 16, backgroundColor: '#0b1018' } },
      ce(wh.Title, { iconId: cfg.iconId || 'app_welcome', badge: data.loading ? '...' : String(visible.length) }, cfg.title || 'PS5 Reddit'),
      ce(View, { style: { flex: 1, marginTop: 8 } },
        rows.length ? rows : [ce(Text, { key: 'state', style: { fontSize: FS_BODY, color: '#9cabbc' } }, data.error || (data.loading ? 'Fetching posts...' : 'No posts found.'))],
        browserStatus ? ce(Text, { key: 'browser', style: { marginTop: 6, fontSize: FS_SMALL, color: '#ffd27a' } }, browserStatus) : null,
        ce(Text, { key: 'hints', style: { marginTop: 6, fontSize: FS_SMALL, color: '#8290a2' } }, 'X opens thread  -  Square refreshes')
      )
    );
  }

  wh.register(Reddit);
})(globalThis.__wh);
