// Google News - top US headlines with L1/R1 stepping and browser open.
// Feed: https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en (RSS, not /home).
// No DOMParser in the hub: items are parsed by hand from the RSS text.
(function (wh) {
  var React = wh.React;
  var View = wh.View;
  var Text = wh.Text;
  var ce = React.createElement;
  var log = wh.logger ? wh.logger('google-news') : function () {};
  var FONT = wh.FontSize || {};
  var FS_BODY = FONT.Size3XSmall || 18;
  var FS_SMALL = FONT.Size4XSmall || 15;
  var FS_TITLE = FONT.Size2XSmall || 21;
  var FEED_URL = 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
  var REQUEST_TIMEOUT_MS = 12000;
  var REFRESH_MS = 15 * 60 * 1000;
  var WINDOW_SIZE = 4;

  function clean(value, max) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max || 200); }

  function decodeEntities(value) {
    return String(value || '')
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&(amp|lt|gt|quot|#39|#x27|#x2F);/g, function (m, code) {
        if (code === 'amp') return '&';
        if (code === 'lt') return '<';
        if (code === 'gt') return '>';
        if (code === 'quot') return '"';
        return "'";
      })
      .replace(/&#(\d+);/g, function (m, digits) {
        var n = parseInt(digits, 10);
        return isFinite(n) ? String.fromCharCode(n) : m;
      })
      .replace(/&#x([0-9a-fA-F]+);/g, function (m, hex) {
        var n = parseInt(hex, 16);
        return isFinite(n) ? String.fromCharCode(n) : m;
      });
  }

  function tagContent(block, tag) {
    var m = block.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>'));
    return m ? decodeEntities(m[1]).trim() : '';
  }

  function parseFeed(xml) {
    var items = [];
    var blocks = String(xml || '').match(/<item\b[\s\S]*?<\/item>/g) || [];
    for (var i = 0; i < blocks.length; i++) {
      var title = clean(tagContent(blocks[i], 'title'), 140);
      var link = tagContent(blocks[i], 'link').split(/\s+/)[0];
      if (!title || !/^https?:\/\//i.test(link)) continue;
      var source = '';
      var sm = blocks[i].match(/<source\b[^>]*>([\s\S]*?)<\/source>/);
      if (sm) source = clean(decodeEntities(sm[1]), 60);
      items.push({ id: 'news:' + i + ':' + title.slice(0, 40), title: title, link: link, date: tagContent(blocks[i], 'pubDate'), source: source });
    }
    return items;
  }

  function ageLabel(value) {
    var t = new Date(value).getTime();
    if (!isFinite(t)) return '';
    var mins = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (mins < 60) return mins + 'm ago';
    var hours = Math.round(mins / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.round(hours / 24) + 'd ago';
  }

  function fetchText(url) {
    var request = fetch(url, { headers: { Accept: 'application/rss+xml, application/xml, text/xml' } }).then(function (response) {
      if (!response || !response.ok) throw new Error('News feed returned HTTP ' + (response && response.status || 'no response'));
      return response.text();
    });
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        reject(new Error('News request timed out'));
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

  function HeadlineRow(props) {
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
      style: { minHeight: 62, padding: 8, marginBottom: 6, borderRadius: 9,
        backgroundColor: active ? '#173345' : '#192535',
        borderWidth: (active || focused) ? 2 : 1,
        borderColor: focused ? '#ffffff' : (active ? '#68d9f5' : '#2a3a4d') }
    },
      ce(View, { style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 } },
        ce(Text, { style: { fontSize: FS_SMALL, color: '#ffd27a', fontWeight: 'bold' }, numberOfLines: 1 }, item.source || 'GOOGLE NEWS'),
        ce(Text, { style: { fontSize: FS_SMALL, color: '#9cabbc' } }, ageLabel(item.date))),
      ce(Text, { style: { fontSize: FS_BODY, color: '#f4f7fb', fontWeight: active ? 'bold' : 'normal' }, numberOfLines: 2 }, clean(item.title, 140))
    );
  }

  function News(props) {
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
      fetchText(FEED_URL).then(function (xml) {
        var items = parseFeed(xml);
        if (!items.length) throw new Error('Feed returned no headlines');
        if (activeRef.current) {
          setData({ loading: false, error: '', items: items });
          setSelectedId(function (oldId) { return items.some(function (it) { return it.id === oldId; }) ? oldId : items[0].id; });
        }
      }).catch(function (error) {
        if (activeRef.current) setData(function (old) { return { loading: false, error: clean(error && error.message || 'Could not load headlines.', 100), items: old.items || [] }; });
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
      if (!item || !/^https?:\/\/\S+$/i.test(item.link)) { setBrowserStatus('No web page is available for this item.'); log('browser open refused: bad link'); return true; }
      var host = item.link.replace(/^https?:\/\/([^\/]+).*$/, '$1');
      setBrowserStatus('Opening in the PS5 browser...');
      log('browser open attempt host=' + host);
      fetch('http://127.0.0.1:8098/__browser?url=' + encodeURIComponent(item.link)).then(function (response) {
        if (!response || !response.ok) throw new Error('The browser bridge refused this link (HTTP ' + (response && response.status || 'none') + ').');
        return response.json();
      }).then(function (result) {
        if (!result || !result.ok) throw new Error(result && result.error || 'The PS5 browser did not open.');
        setBrowserStatus('Opened in the PS5 browser. Press Circle to return.');
        log('browser opened host=' + host);
      }).catch(function (error) {
        setBrowserStatus('Could not open page: ' + clean(error && error.message || error, 140));
        log('browser open failed host=' + host + ' err=' + clean(error && error.message || error, 160));
      });
      return true;
    }

    wh.onPressed(wh.Button.Square, function () { load(); });
    wh.onPressed(wh.Button.L1, function () { step(-1); });
    wh.onPressed(wh.Button.R1, function () { step(1); });

    var windowStart = Math.max(0, Math.min(selectedIndex - 1, visible.length - WINDOW_SIZE));
    var rows = visible.slice(windowStart, windowStart + WINDOW_SIZE).map(function (item) {
      return ce(HeadlineRow, { key: item.id, item: item, active: selected && item.id === selected.id,
        onFocusItem: function (it) { setSelectedId(it.id); },
        onPress: function () { setSelectedId(item.id); setBrowserStatus(''); openInBrowser(item); } });
    });

    return ce(View, { style: { width: props.width || 504, height: props.height || 504, padding: 14, borderRadius: 16, backgroundColor: '#0b1018' } },
      ce(wh.Title, { iconId: cfg.iconId || 'app_welcome', iconImage: (cfg.assetBase || '') + 'glyph-color.png', badge: data.loading ? '...' : String(visible.length) }, cfg.title || 'Google News'),
      ce(View, { style: { flex: 1, marginTop: 8 } },
        rows.length ? rows : [ce(Text, { key: 'state', style: { fontSize: FS_BODY, color: '#9cabbc' } }, data.error || (data.loading ? 'Fetching headlines...' : 'No headlines found.'))],
        browserStatus ? ce(Text, { key: 'browser', style: { marginTop: 6, fontSize: FS_SMALL, color: '#ffd27a' } }, browserStatus) : null,
        ce(Text, { key: 'hints', style: { marginTop: 6, fontSize: FS_SMALL, color: '#8290a2' } }, 'X opens article  -  Square refreshes')
      )
    );
  }

  wh.register(News);
})(globalThis.__wh);
