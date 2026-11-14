// TMZ headlines: L1/R1 changes the featured story; X opens the TMZ article.
(function (wh) {
  var React = wh.React;
  var View = wh.View;
  var Text = wh.Text;
  var Image = wh.Image;
  var ce = React.createElement;
  var log = wh.logger ? wh.logger('tmz') : function () {};
  var cfg = (wh.config || {});
  var FS = wh.FontSize || {};
  var SMALL = FS.Size4XSmall || 15;
  var BODY = FS.Size3XSmall || 18;
  var TITLE = FS.Size2XSmall || 21;
  var FEED_URL = cfg.feedUrl || 'https://www.tmz.com/rss.xml';
  var MAX_ITEMS = 30;
  var REFRESH_MS = 15 * 60 * 1000;

  function clean(value, max) { return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max || 240); }
  function decode(value) {
    return String(value || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
      .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(parseInt(n, 10)); })
      .replace(/&#x([\da-f]+);/gi, function (m, n) { return String.fromCharCode(parseInt(n, 16)); });
  }
  function content(xml, name) {
    var safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var m = String(xml || '').match(new RegExp('<(?:[\\w.-]+:)?' + safe + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?' + safe + '\\s*>', 'i'));
    return m ? decode(m[1]).trim() : '';
  }
  function attr(block, tag, attribute) {
    var re = new RegExp('<(?:[\\w.-]+:)?' + tag + '\\b([^>]*)>', 'i');
    var match = String(block || '').match(re);
    if (!match) return '';
    var a = match[1].match(new RegExp("\\b" + attribute + "\\s*=\\s*[\\\"']([^\\\"']+)", 'i'));
    return a ? decode(a[1]) : '';
  }
  function imageFrom(block) {
    var candidate = attr(block, 'content', 'url') || attr(block, 'thumbnail', 'url') || attr(block, 'enclosure', 'url');
    if (!candidate) {
      var description = content(block, 'description') || content(block, 'encoded');
      var img = description.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
      if (img) candidate = decode(img[1]);
    }
    // The Welcome Hub Image view only accepts HTTP URLs. Keep the image on
    // TMZ's own image host; opening the article still uses its HTTPS URL.
    return /^https:\/\//i.test(candidate) ? candidate.replace(/^https:/i, 'http:') : candidate;
  }
  function parseFeed(xml) {
    var blocks = String(xml || '').match(/<(?:[\w.-]+:)?item\b[\s\S]*?<\/(?:[\w.-]+:)?item\s*>/gi) || [];
    var list = [];
    for (var i = 0; i < blocks.length && list.length < MAX_ITEMS; i++) {
      var title = clean(content(blocks[i], 'title'), 180);
      var link = clean(content(blocks[i], 'link'), 500);
      if (!title || !/^https:\/\/(?:www\.)?tmz\.com\//i.test(link)) continue;
      list.push({ id: link, title: title, link: link, date: content(blocks[i], 'pubDate'), image: imageFrom(blocks[i]) });
    }
    return list;
  }
  function fetchFeed() {
    return fetch(FEED_URL, { headers: { Accept: 'application/rss+xml, application/xml, text/xml' } }).then(function (r) {
      if (!r || !r.ok) throw new Error('TMZ feed HTTP ' + (r && r.status || '?'));
      return r.text();
    }).then(function (xml) {
      var items = parseFeed(xml);
      if (!items.length) throw new Error('TMZ feed returned no usable stories');
      return items;
    });
  }
  function StoryTile(props) {
    var item = props.item;
    return ce(wh.Focusable, {
      onPress: props.onPress,
      style: { flex: 1, overflow: 'hidden', borderRadius: 14, backgroundColor: '#151820', borderWidth: 1, borderColor: '#6f2028' },
      focusedStyle: { borderWidth: 3, borderColor: '#ffffff' }
    },
      item.image ? ce(Image, { source: { uri: item.image }, resizeMode: 'cover', style: { width: '100%', height: '68%', backgroundColor: '#22252c' } }) :
        ce(View, { style: { width: '100%', height: '68%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#24242a' } },
          ce(Text, { style: { fontSize: 45, color: '#ed1c24', fontWeight: 'bold' } }, 'TMZ')),
      ce(View, { style: { flex: 1, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#11141a' } },
        ce(Text, { style: { fontSize: SMALL, color: '#ff5158', fontWeight: 'bold', marginBottom: 4 } }, 'TMZ  •  ' + (props.position + ' / ' + props.count)),
        ce(Text, { style: { fontSize: TITLE, color: '#ffffff', fontWeight: 'bold' }, numberOfLines: 2 }, item.title),
        ce(Text, { style: { fontSize: SMALL, color: '#c0c5ce', marginTop: 5 } }, 'X  OPEN STORY IN BROWSER')
      )
    );
  }
  function TMZ(props) {
    var statePair = React.useState({ loading: true, error: '', items: [] });
    var state = statePair[0], setState = statePair[1];
    var indexPair = React.useState(0);
    var index = indexPair[0], setIndex = indexPair[1];
    var statusPair = React.useState('');
    var status = statusPair[0], setStatus = statusPair[1];
    var imgPair = React.useState({});
    var imgs = imgPair[0], setImgs = imgPair[1];
    var alive = React.useRef(true);
    var inflightRef = React.useRef({});
    function load() {
      setState(function (old) { return { loading: true, error: '', items: old.items || [] }; });
      fetchFeed().then(function (items) {
        if (!alive.current) return;
        setState({ loading: false, error: '', items: items });
        setIndex(function (old) { return old < items.length ? old : 0; });
      }).catch(function (err) {
        if (alive.current) setState(function (old) { return { loading: false, error: clean(err && err.message || 'Could not load TMZ stories.', 120), items: old.items || [] }; });
      });
    }
    React.useEffect(function () {
      alive.current = true; load();
      var timer = setInterval(load, REFRESH_MS);
      return function () { alive.current = false; clearInterval(timer); };
    }, []);
    function step(delta) {
      if (!state.items.length) return false;
      setIndex((index + delta + state.items.length) % state.items.length);
      setStatus('');
      return true;
    }
    // The RSS feed carries no images, so resolve the article's og:image
    // on demand and cache it. Article pages are only fetched for stories
    // the user actually views.
    function resolveImage(item) {
      if (!item || item.image || imgs[item.link] || inflightRef.current[item.link]) return;
      inflightRef.current[item.link] = true;
      var timer = setTimeout(function () { delete inflightRef.current[item.link]; }, 12000);
      fetch(item.link, { headers: { Accept: 'text/html' } }).then(function (r) {
        if (!r || !r.ok) throw new Error('article HTTP ' + (r && r.status || '?'));
        return r.text();
      }).then(function (html) {
        var text = String(html || '');
        var m = text.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)/i) ||
                text.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i);
        var url = m ? m[1] : '';
        if (!url) log('no og:image for ' + clean(item.link, 80));
        if (/^https:\/\//i.test(url)) url = url.replace(/^https:/i, 'http:');
        if (url) log('image resolved ' + clean(url.slice(-60), 60));
        if (url && alive.current) setImgs(function (old) {
          var next = {};
          for (var k in old) next[k] = old[k];
          next[item.link] = url;
          return next;
        });
      }).catch(function () {}).then(function () {
        clearTimeout(timer);
        delete inflightRef.current[item.link];
      });
    }
    function open(item) {
      if (!item || !/^https:\/\/(?:www\.)?tmz\.com\//i.test(item.link)) return true;
      setStatus('Opening TMZ story…');
      fetch('http://127.0.0.1:8098/__browser?url=' + encodeURIComponent(item.link)).then(function (r) {
        if (!r || !r.ok) throw new Error('Browser bridge refused the request');
        return r.json();
      }).then(function (r) {
        if (!r || !r.ok) throw new Error(r && r.error || 'Browser did not open');
        setStatus('Opened in browser. Press Circle to return.');
      }).catch(function (e) { setStatus(clean(e && e.message || 'Could not open story.', 100)); });
      return true;
    }
    wh.onPressed(wh.Button.L1, function () { step(-1); });
    wh.onPressed(wh.Button.R1, function () { step(1); });
    wh.onPressed(wh.Button.Square, load);
    var selected = state.items[index] || null;
    React.useEffect(function () { if (selected) resolveImage(selected); }, [index, state.items, imgs]);
    var tileItem = selected ? { title: selected.title, link: selected.link, image: selected.image || imgs[selected.link] || '' } : null;
    return ce(View, { style: { width: props.width || 504, height: props.height || 504, padding: 14, borderRadius: 16, backgroundColor: '#090b10' } },
      ce(wh.Title, { iconId: 'wh:tmz', badge: state.loading ? '…' : (state.items.length ? String(index + 1) + '/' + state.items.length : '!') }, 'TMZ'),
      ce(View, { style: { flex: 1, marginTop: 8 } },
        tileItem ? ce(StoryTile, { item: tileItem, position: index + 1, count: state.items.length, onPress: function () { return open(selected); } }) :
          ce(View, { style: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#151820' } },
            ce(Text, { style: { fontSize: BODY, color: state.error ? '#ff737a' : '#ffffff', textAlign: 'center', padding: 18 } }, state.error || 'Loading TMZ stories…'),
            ce(Text, { style: { fontSize: SMALL, color: '#aab0ba', marginTop: 8 } }, 'Square  REFRESH')),
        status ? ce(Text, { style: { fontSize: SMALL, color: '#ffd27a', marginTop: 5 } }, status) : null,
        ce(Text, { style: { fontSize: SMALL, color: '#9da5b2', textAlign: 'center', marginTop: 5 } }, 'L1  PREVIOUS STORY                 R1  NEXT STORY')
      )
    );
  }
  wh.register(TMZ);
})(globalThis.__wh);
