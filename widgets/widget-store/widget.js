(function (wh) {
  var React = wh.React, View = wh.View, Text = wh.Text, Image = wh.Image, TextInput = wh.TextInput, ScrollView = wh.ScrollView || View, ce = React.createElement;
  var C = { bg: '#090d16', panel: '#111827', panel2: '#172235', line: '#26354d', white: '#f5f8ff', muted: '#8fa2bf', cyan: '#66e4ff', green: '#7cf3bf', gold: '#ffd479' };
  function Txt(value, size, color, extra) { var requested = size || 18, supported = [15, 18, 21, 24, 27, 30, 36, 45, 54, 72], resolved = 15, distance = 1e9; for (var i = 0; i < supported.length; i++) { var d = Math.abs(supported[i] - requested); if (d < distance) { distance = d; resolved = supported[i]; } } var style = { color: color || C.white, fontSize: resolved }; if (extra) for (var k in extra) style[k] = extra[k]; return ce(Text, { style: style }, value == null ? '' : String(value)); }
  function repoAsset(value, catalogUrl) {
    if (typeof value !== 'string' || !value) return '';
    if (/^https:\/\//i.test(value)) return value;
    if (!/^[a-z0-9][a-z0-9._/-]{0,160}\.(png|jpe?g|webp)$/i.test(value) || value.indexOf('..') >= 0) return '';
    var base = String(catalogUrl || '').replace(/\/catalog\.json(?:\?.*)?$/i, '/');
    return base ? base + value.replace(/^\//, '') : '';
  }
  function iconUri(item, catalogUrl) {
    return repoAsset(item && item.icon, catalogUrl);
  }
  function githubPackageUrl(item, catalogUrl) {
    var repo = String(catalogUrl || '').match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\//i);
    var files = item && Array.isArray(item.files) ? item.files : [], file = '';
    for (var i = 0; i < files.length; i++) if (typeof files[i] === 'string' && /(?:^|\/)config\.json$/i.test(files[i])) { file = files[i]; break; }
    var raw = file.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i);
    if (raw) { repo = raw; file = raw[4]; }
    if (!repo || !file || file.charAt(0) === '/' || file.indexOf('..') >= 0) return '';
    var folder = file.replace(/\/[^/]+$/, ''), parts = folder.split('/');
    for (var j = 0; j < parts.length; j++) if (!/^[A-Za-z0-9._-]{1,128}$/.test(parts[j])) return '';
    if (repo[1].toLowerCase() === 'manchildtechnologies-ui' && repo[2].toLowerCase() === 'ps5-widget-store' && item && typeof item.id === 'string' && /^[a-z0-9][a-z0-9._-]{0,62}$/i.test(item.id)) {
      return 'https://manchildtechnologies-ui.github.io/ps5-widget-store/?widget=' + encodeURIComponent(item.id);
    }
    return 'https://github.com/' + repo[1] + '/' + repo[2] + '/tree/' + repo[3] + '/' + parts.map(encodeURIComponent).join('/');
  }
  function WidgetStore(props) {
    var cfg = props.config || {}, saved = props.settings || {};
    var localPair = React.useState({}), local = localPair[0], setLocal = localPair[1];
    function save(key, value) { setLocal(function (old) { var n = {}; for (var k in old) if (Object.prototype.hasOwnProperty.call(old, k)) n[k] = old[k]; n[key] = value; return n; }); if (props.onSettingChange) props.onSettingChange(key, value); }
    function storeLog(message) { try { if (typeof wh.log === 'function') wh.log('widget store: ' + String(message).slice(0, 180)); } catch (e) {} }
    function binaryResponseBody(response) {
      if (response && typeof response.blob === 'function') return response.blob();
      if (response && typeof response.arrayBuffer === 'function') return response.arrayBuffer();
      throw new Error('This runtime cannot read binary package files.');
    }
    var repoValue = Object.prototype.hasOwnProperty.call(local, 'repos') ? local.repos : saved.repos, repos = [];
    if (typeof repoValue === 'string') { try { var p = JSON.parse(repoValue); if (Array.isArray(p)) repos = p.filter(function (u) { return typeof u === 'string' && /^https:\/\/raw\.githubusercontent\.com\//.test(u); }); } catch (e) {} }
    else if (!Object.prototype.hasOwnProperty.call(local, 'repos') && !Object.prototype.hasOwnProperty.call(saved, 'repos') && cfg.catalogUrl) repos = [cfg.catalogUrl];
    var activeCandidate = Object.prototype.hasOwnProperty.call(local, 'activeRepo') ? local.activeRepo : saved.activeRepo;
    var activeRepo = repos.indexOf(activeCandidate) >= 0 ? activeCandidate : (repos[0] || '');
    var dataPair = React.useState({ loading: true, error: '', widgets: [], version: '' }), data = dataPair[0], setData = dataPair[1];
    var indexPair = React.useState(0), selectedIndex = indexPair[0], setSelectedIndex = indexPair[1];
    var pagePair = React.useState('list'), page = pagePair[0], setPage = pagePair[1];
    var statusPair = React.useState(''), status = statusPair[0], setStatus = statusPair[1];
    var installPair = React.useState(false), installing = installPair[0], setInstalling = installPair[1];
    var progressPair = React.useState(0), progress = progressPair[0], setProgress = progressPair[1];
    var installedValue = Object.prototype.hasOwnProperty.call(local, 'installedWidgets') ? local.installedWidgets : saved.installedWidgets, installedIds = [];
    try { var parsedInstalled = JSON.parse(installedValue || '[]'); if (Array.isArray(parsedInstalled)) installedIds = parsedInstalled.filter(function (id) { return typeof id === 'string'; }); } catch (e) {}
    var versionsValue = Object.prototype.hasOwnProperty.call(local, 'installedVersions') ? local.installedVersions : saved.installedVersions, installedVersions = {};
    try { var parsedVersions = JSON.parse(versionsValue || '{}'); if (parsedVersions && typeof parsedVersions === 'object' && !Array.isArray(parsedVersions)) installedVersions = parsedVersions; } catch (e) {}
    function isInstalled(id) { return installedIds.indexOf(id) >= 0; }
    function compareVersions(a, b) {
      var left = String(a || '').replace(/^[vV]/, '').split(/[+-]/)[0].split('.');
      var right = String(b || '').replace(/^[vV]/, '').split(/[+-]/)[0].split('.');
      if (!left.length || !right.length || left.some(function (n) { return !/^\d+$/.test(n); }) || right.some(function (n) { return !/^\d+$/.test(n); })) return null;
      for (var i = 0; i < Math.max(left.length, right.length); i++) { var x = parseInt(left[i] || '0', 10), y = parseInt(right[i] || '0', 10); if (x !== y) return x > y ? 1 : -1; }
      return 0;
    }
    function hasUpdate(item) { if (!item || !isInstalled(item.id) || !item.version) return false; var installedVersion = installedVersions[item.id]; if (!installedVersion) return true; return compareVersions(item.version, installedVersion) === 1; }
    function markInstalled(id, version) { if (!isInstalled(id)) save('installedWidgets', JSON.stringify(installedIds.concat([id]))); var next = {}; for (var k in installedVersions) if (Object.prototype.hasOwnProperty.call(installedVersions, k)) next[k] = installedVersions[k]; if (version) next[id] = String(version); save('installedVersions', JSON.stringify(next)); }
    function loadCatalog(url) {
      var target = url || activeRepo;
      if (!target) { setData({ loading: false, error: '', widgets: [], version: '' }); setSelectedIndex(0); return; }
      setData({ loading: true, error: '', widgets: [], version: '' });
      fetch(target, { headers: { Accept: 'application/json' } }).then(function (r) { if (!r || !r.ok) throw new Error('GitHub catalog returned ' + (r && r.status || 'no response')); return r.json(); }).then(function (manifest) {
        var entries = manifest && Array.isArray(manifest.widgets) ? manifest.widgets.filter(function (it) { return it && typeof it.id === 'string' && typeof it.title === 'string'; }) : [];
        setData({ loading: false, error: '', widgets: entries, version: String(manifest && manifest.version || '') }); setSelectedIndex(0); setPage('list'); setStatus('');
      }).catch(function (err) { setData({ loading: false, error: String(err && err.message || 'Could not load GitHub catalog.'), widgets: [], version: '' }); setPage('list'); });
    }
    React.useEffect(function () { loadCatalog(activeRepo); }, [activeRepo]);
    wh.onPressed(wh.Button.Square, function () { loadCatalog(activeRepo); });
    var managerPair = React.useState(false), managerOpen = managerPair[0], setManagerOpen = managerPair[1];
    var editorPair = React.useState(false), editorOpen = editorPair[0], setEditorOpen = editorPair[1];
    var draftPair = React.useState(''), draft = draftPair[0], setDraft = draftPair[1];
    var errorPair = React.useState(''), repoError = errorPair[0], setRepoError = errorPair[1];
    function repoLabel(url) { var m = String(url || '').match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\//); return m ? m[1] + '/' + m[2] : 'No repository'; }
    function normalizeRepo(input) {
      var value = String(input || '').trim(), raw = value.match(/^https:\/\/raw\.githubusercontent\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9._-]+)\/catalog\.json$/i);
      if (raw) return Promise.resolve(value);
      var gh = value.match(/^https:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)\/?$/i);
      if (!gh) return Promise.reject(new Error('Enter a GitHub repository URL or raw catalog.json URL.'));
      return fetch('https://api.github.com/repos/' + gh[1] + '/' + gh[2], { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) { if (!r || !r.ok) throw new Error('GitHub could not find that repository.'); return r.json(); }).then(function (info) { var branch = String(info.default_branch || ''); if (!/^[A-Za-z0-9._-]+$/.test(branch)) throw new Error('Unsupported default branch name.'); return 'https://raw.githubusercontent.com/' + gh[1] + '/' + gh[2] + '/' + branch + '/catalog.json'; });
    }
    function addRepo() { setRepoError('Checking repository…'); normalizeRepo(draft).then(function (url) { return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) { if (!r || !r.ok) throw new Error('Could not read catalog.json from that repository.'); return r.json(); }).then(function (manifest) { if (!manifest || !Array.isArray(manifest.widgets)) throw new Error('Catalog must contain a widgets list.'); return url; }); }).then(function (url) { var next = repos.slice(); if (next.indexOf(url) < 0 && next.length >= 12) throw new Error('The saved list is full (12 repositories).'); if (next.indexOf(url) < 0) next.push(url); save('repos', JSON.stringify(next)); save('activeRepo', url); setRepoError(''); setEditorOpen(false); setManagerOpen(false); }).catch(function (e) { setRepoError(String(e && e.message || 'Could not add repository.')); }); }
    function removeRepo() { if (!activeRepo) return; var next = repos.filter(function (u) { return u !== activeRepo; }); save('repos', JSON.stringify(next)); save('activeRepo', next[0] || ''); setStatus('Removed ' + repoLabel(activeRepo)); }
    function selectRepo(url) { if (repos.indexOf(url) < 0) return; save('activeRepo', url); setManagerOpen(false); }
    function cancelRepoEntry() { setEditorOpen(false); setManagerOpen(true); setRepoError(''); }
    wh.onPressed(wh.Button.Triangle, function () { if (editorOpen) { cancelRepoEntry(); return true; } if (managerOpen) { setManagerOpen(false); return true; } if (page === 'details' && selected) { openPackageBrowser(); return true; } return false; });
    wh.onPressed(wh.Button.R2, function () { if (page === 'details' && selected) { installSelected(); return true; } return false; });
    wh.onPressed(wh.Button.L1, function () {
      if (editorOpen) { cancelRepoEntry(); return true; }
      if (managerOpen) { setManagerOpen(false); return true; }
      if (page === 'details' && selected) {
        if (installing) return true;
        setPage('list'); setStatus(''); setProgress(0); return true;
      }
      return step(-1);
    });
    wh.onPressed(wh.Button.R1, function () {
      if (managerOpen || editorOpen || page !== 'list') return false;
      return step(1);
    });
    function openRepoEntry() { setDraft(''); setRepoError(''); setManagerOpen(false); setEditorOpen(true); }
    function openRepoManager() { setManagerOpen(true); }
    if (wh.onSettingAction) wh.onSettingAction('manageSources', openRepoManager);
    var items = data.widgets, selected = items.length ? items[Math.max(0, Math.min(selectedIndex, items.length - 1))] : null;
    function openPackageBrowser() {
      var url = githubPackageUrl(selected, activeRepo);
      if (!url) { setStatus('Could not build a GitHub link for this package.'); return; }
      setStatus('Opening the package page in the PS5 browser…');
      fetch('http://127.0.0.1:8098/__browser?url=' + encodeURIComponent(url)).then(function (r) { if (!r || !r.ok) throw new Error('Bridge refused the browser request.'); return r.json(); }).then(function (result) { if (!result || !result.ok) throw new Error(result && result.error || 'PS5 browser did not open.'); setStatus('Opened GitHub in the PS5 browser. Press Circle to return.'); }).catch(function (e) { setStatus('Browser launch failed: ' + String(e && e.message || e)); });
    }
    function step(direction) { if (installing) return true; if (!items.length) return false; setSelectedIndex((selectedIndex + direction + items.length) % items.length); setStatus(''); setProgress(0); return true; }
    function installSelected() {
      if (!selected) return false;
      if (installing) return true;
      var files = Array.isArray(selected.files) ? selected.files.slice(0, 16) : [];
      if (!files.length) { setStatus('This listing has no install files yet.'); return true; }
      if (files.some(function (path) { return typeof path !== 'string' || path.indexOf('..') >= 0 || (!/^https:\/\/raw\.githubusercontent\.com\//i.test(path) && (!/^[a-z0-9][a-z0-9._/-]{0,200}$/i.test(path) || path.charAt(0) === '/')); })) { setStatus('Install manifest has an unsafe file path.'); return true; }
      var names = files.map(function (path) { return typeof path === 'string' ? path.split('/').pop() : ''; });
      if (names.some(function (name) { return !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(name) || name.indexOf('..') >= 0; }) || names.indexOf('config.json') < 0 || names.indexOf('widget.js') < 0 || names.filter(function (name, i) { return names.indexOf(name) !== i; }).length) { setStatus('Install manifest is invalid.'); return true; }
      storeLog('install start ' + selected.id + ' (' + files.length + ' files)');
      setInstalling(true); setProgress(5); setStatus('Downloading files from GitHub…');
      var base = String(activeRepo || '').replace(/\/catalog\.json(?:\?.*)?$/i, '/');
      Promise.all(files.map(function (path, index) {
        var url = /^https:\/\//i.test(path) ? path : base + String(path).replace(/^\//, '');
        if (!/^https:\/\/raw\.githubusercontent\.com\//i.test(url)) throw new Error('Package files must come from raw.githubusercontent.com.');
        return fetch(url).then(function (r) { if (!r || !r.ok) throw new Error('Could not fetch ' + names[index] + ' (' + (r && r.status || '?') + ').'); return names[index] === 'config.json' || names[index] === 'widget.js' || /\.(json|js|md|txt)$/i.test(names[index]) ? r.text() : binaryResponseBody(r); }).then(function (body) { return { name: names[index], body: body }; });
      })).then(function (payloads) {
        storeLog('downloads complete ' + selected.id);
        payloads.sort(function (a, b) { return a.name === 'config.json' ? -1 : (b.name === 'config.json' ? 1 : (a.name === 'widget.js' ? -1 : (b.name === 'widget.js' ? 1 : 0))); });
        var cfgFile = payloads.filter(function (f) { return f.name === 'config.json'; })[0], cfgJson;
        try { cfgJson = JSON.parse(cfgFile.body); } catch (e) { throw new Error('Package config.json is invalid.'); }
        if (!cfgJson || cfgJson.id !== selected.id) throw new Error('Package ID does not match this catalog listing.');
        setProgress(35); setStatus('Installing into /data/wh-widgets/' + selected.id + '…');
        var endpoint = 'http://127.0.0.1:8098/__install/file?i=' + encodeURIComponent(selected.id);
        var sentCount = 0;
        return payloads.reduce(function (chain, file) {
          return chain.then(function () { return fetch(endpoint + '&f=' + encodeURIComponent(file.name), { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file.body }).then(function (r) { if (!r || !r.ok) { storeLog('bridge rejected ' + file.name + ' status=' + (r && r.status || '?')); throw new Error('Bridge rejected ' + file.name + '.'); } return r.json(); }).then(function (result) { if (!result || !result.ok) { storeLog('bridge rejected ' + file.name + ': ' + (result && result.error || 'unknown')); throw new Error(result && result.error || ('Bridge rejected ' + file.name + '.')); } storeLog('staged ' + file.name); sentCount++; setProgress(35 + Math.round(55 * sentCount / payloads.length)); }); });
        }, Promise.resolve()).then(function () { return fetch('http://127.0.0.1:8098/__install/commit?i=' + encodeURIComponent(selected.id), { method: 'POST' }).then(function (r) { if (!r || !r.ok) throw new Error('Bridge could not finalize the widget folder.'); return r.json(); }); });
      }).then(function (result) { if (!result || !result.ok) throw new Error(result && result.error || 'Install did not finish.'); storeLog('install committed ' + selected.id); markInstalled(selected.id, selected.version); setProgress(100); setStatus(selected.title + ' ' + (hasUpdate(selected) ? 'updated' : 'installed') + ' in /data/wh-widgets/' + selected.id + '. The hub will refresh shortly.'); }).catch(function (e) { var message = String(e && e.message || e); storeLog('install failed ' + selected.id + ': ' + message); setStatus('Install failed: ' + message); }).then(function () { setInstalling(false); });
      return true;
    }
    function mainPress() { if (page === 'list' && selected) { setPage('details'); setStatus(''); return true; } return page === 'details'; }
    function left() { if (page === 'details') { setPage('list'); setStatus(''); return true; } return step(-1); }
    function right() { if (page === 'details') return step(1); return step(1); }
    var main;
    if (data.loading) main = ce(View, { style: { flex: 1, alignItems: 'center', justifyContent: 'center' } }, Txt('CONNECTING TO GITHUB', 21, C.cyan), Txt('Loading the widget catalog…', 18, C.muted, { marginTop: 10 }));
    else if (data.error) main = ce(View, { style: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18 } }, Txt('CATALOG OFFLINE', 21, C.gold), Txt(data.error, 18, C.muted, { marginTop: 10 }), Txt('Press □ to retry', 15, C.cyan, { marginTop: 10 }));
    else if (!selected) main = ce(View, { style: { flex: 1, alignItems: 'center', justifyContent: 'center' } }, Txt(activeRepo ? 'NO WIDGETS IN THIS CATALOG' : 'NO SOURCE SELECTED', 21, C.cyan), Txt('Open Settings to manage GitHub sources.', 18, C.muted, { marginTop: 8 }));
    else if (page === 'list') {
      var windowSize = 4, start = Math.max(0, Math.min(selectedIndex - 2, items.length - windowSize));
      var rows = items.slice(start, start + windowSize).map(function (item, offset) {
        var idx = start + offset, active = idx === selectedIndex, uri = iconUri(item, activeRepo);
        return ce(View, { key: item.id, style: { minHeight: 65, padding: 8, marginBottom: 6, borderRadius: 11, backgroundColor: active ? '#173345' : C.panel2, borderWidth: active ? 2 : 1, borderColor: active ? C.cyan : C.line, flexDirection: 'row', alignItems: 'center' } },
          ce(View, { style: { width: 48, height: 48, borderRadius: 10, marginRight: 10, backgroundColor: '#263a58', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' } }, Image && uri ? ce(Image, { source: { uri: uri }, resizeMode: 'contain', style: { width: 48, height: 48 } }) : Txt(String(item.glyph || '✦').slice(0, 2), 23, C.cyan)),
          ce(View, { style: { flex: 1, minWidth: 0 } }, ce(View, { style: { flexDirection: 'row', alignItems: 'center' } }, Txt(item.title, 18, C.white, { fontWeight: active ? 'bold' : 'normal', flex: 1 }), hasUpdate(item) ? Txt('UPDATE', 15, C.gold, { fontWeight: 'bold', marginLeft: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, backgroundColor: '#49391d' }) : null), Txt((item.category || 'Widget').toUpperCase() + (item.version ? '  ·  v' + item.version : ''), 15, C.muted, { marginTop: 3 })), isInstalled(item.id) && !hasUpdate(item) ? Txt('✓ INSTALLED', 15, C.green, { fontWeight: 'bold', marginRight: 8 }) : null, Txt(active ? '›' : '', 24, C.cyan));
      });
      main = ce(View, { style: { flex: 1 } }, ce(View, { style: { height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } }, Txt('L1 / R1  BROWSE WIDGETS', 15, C.cyan, { fontWeight: 'bold' }), Txt((selectedIndex + 1) + ' / ' + items.length, 15, C.muted)), rows);
    } else {
      var imageUri = iconUri(selected, activeRepo);
      var screenshots = Array.isArray(selected.screenshots) ? selected.screenshots.slice(0, 8).map(function (shot) { return typeof shot === 'string' ? { url: shot } : shot; }).filter(function (shot) { return shot && repoAsset(shot.url, activeRepo); }) : [];
      main = ce(View, { style: { flex: 1, padding: 12, alignItems: 'center' } },
        ce(View, { style: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line } },
          ce(View, { style: { width: 62, height: 62, borderRadius: 14, backgroundColor: '#263a58', alignItems: 'center', justifyContent: 'center', marginRight: 12, overflow: 'hidden' } }, Image && imageUri ? ce(Image, { source: { uri: imageUri }, resizeMode: 'contain', style: { width: 62, height: 62 } }) : Txt(String(selected.glyph || '✦').slice(0, 2), 30, C.cyan)),
          ce(View, { style: { flex: 1, minWidth: 0 } }, Txt(String(selected.category || 'COMMUNITY WIDGET').toUpperCase(), 15, C.cyan, { fontWeight: 'bold' }), Txt(selected.title, 23, C.white, { fontWeight: 'bold', marginTop: 5 }), ce(View, { style: { flexDirection: 'row', alignItems: 'center', marginTop: 3 } }, Txt('VERSION  ' + (selected.version || '—'), 15, C.muted, { flex: 1 }), hasUpdate(selected) ? Txt('UPDATE AVAILABLE', 15, C.gold, { fontWeight: 'bold', marginLeft: 8 }) : null))),
        ce(ScrollView, { style: { width: '100%', flex: 1, marginTop: 10 }, showsVerticalScrollIndicator: true },
          Txt('SCREENSHOTS' + (screenshots.length ? '  ·  ' + screenshots.length : ''), 15, C.cyan, { fontWeight: 'bold', marginBottom: 6 }),
          screenshots.length ? ce(ScrollView, { horizontal: true, showsHorizontalScrollIndicator: true, style: { height: 150, marginBottom: 10 } }, screenshots.map(function (shot, index) {
            var uri = repoAsset(shot.url, activeRepo);
            return ce(View, { key: 'shot-' + index, style: { width: 300, height: 138, marginRight: 9, borderRadius: 10, backgroundColor: '#080c13', borderWidth: 1, borderColor: C.line, overflow: 'hidden' } },
              Image ? ce(Image, { source: { uri: uri }, resizeMode: 'contain', style: { width: 300, height: 112 } }) : null,
              shot.label ? Txt(shot.label, 14, C.muted, { marginHorizontal: 7, marginTop: 2 }) : null);
          })) : Txt('No screenshots yet. Developers can add image paths in the catalog.', 15, C.muted, { marginBottom: 10 }),
          Txt(selected.description || 'A community-made Welcome Hub widget.', 18, C.white, { lineHeight: 25 }),
          Txt(String(selected.downloads || 0) + ' DOWNLOADS', 15, C.muted, { marginTop: 10 }),
          selected.sha256 ? Txt('PACKAGE CHECKSUM  ' + String(selected.sha256).slice(0, 16) + '…', 15, C.muted, { marginTop: 6 }) : null,
          status ? Txt(status, 16, C.gold, { marginTop: 10, lineHeight: 22 }) : null),
        installing || progress === 100 ? ce(View, { style: { height: 10, width: '100%', marginTop: 5, borderRadius: 5, backgroundColor: '#26354d', overflow: 'hidden' } }, ce(View, { style: { height: 10, width: progress + '%', borderRadius: 5, backgroundColor: progress === 100 ? C.green : C.cyan } })) : null,
        installing || progress === 100 ? Txt(progress + '%', 15, C.cyan, { marginTop: 2, textAlign: 'right' }) : null,
        ce(View, { style: { width: '100%', flexDirection: 'row', alignItems: 'center', marginTop: 12 } },
          ce(wh.Focusable, { onPress: openPackageBrowser, style: { flex: 1, height: 58, marginRight: 12, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', borderRadius: 29, backgroundColor: '#15394a', borderWidth: 2, borderColor: C.cyan }, focusedStyle: { borderColor: C.white, borderWidth: 3 } }, Txt('△  INFO', 21, C.white, { fontWeight: 'bold', textAlign: 'center' })),
          ce(wh.Focusable, { onPress: installSelected, style: { flex: 1, height: 58, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', borderRadius: 29, backgroundColor: hasUpdate(selected) ? '#49391d' : (isInstalled(selected.id) ? '#172c2a' : '#15533f'), borderWidth: 2, borderColor: hasUpdate(selected) ? C.gold : C.green }, focusedStyle: { borderColor: C.white, borderWidth: 3 } }, Txt(installing ? 'INSTALLING…' : (hasUpdate(selected) ? 'R2  UPDATE' : (isInstalled(selected.id) ? 'R2  REINSTALL' : 'R2  INSTALL')), 18, C.white, { fontWeight: 'bold', textAlign: 'center' }))));
    }
    var panelStyle = { flex: 1, minHeight: 0, padding: 9, borderRadius: 13, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line };
    var mainPanel = managerOpen || editorOpen ? ce(View, { style: panelStyle }, main) : ce(wh.Focusable, { key: 'store-main-panel', onPress: mainPress, buttons: { L: left, R: right }, style: panelStyle, focusedStyle: { borderColor: C.white, borderWidth: 2 } }, main);
    var repoRows = repos.map(function (url, i) { var active = url === activeRepo; return ce(wh.Focusable, { key: 'repo-' + i, onPress: function () { selectRepo(url); }, style: { padding: 10, marginBottom: 6, borderRadius: 10, backgroundColor: active ? '#173345' : C.panel, borderWidth: 1, borderColor: active ? C.cyan : C.line }, focusedStyle: { borderColor: C.white, borderWidth: 2 } }, ce(View, { style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } }, Txt(repoLabel(url), 18, C.white, { fontWeight: 'bold' }), Txt(active ? 'ACTIVE' : 'SELECT', 15, active ? C.green : C.cyan))); });
    var overlay = managerOpen ? ce(View, { style: { position: 'absolute', left: 14, right: 14, top: 52, bottom: 16, zIndex: 20, padding: 14, borderRadius: 15, borderWidth: 2, borderColor: C.cyan, backgroundColor: '#101827' } }, Txt('SOURCES', 21, C.white, { fontWeight: 'bold' }), Txt('Choose a source, or add or remove one.', 15, C.muted, { marginTop: 4, marginBottom: 9 }), repoRows.length ? ce(ScrollView, { style: { maxHeight: 180 }, showsVerticalScrollIndicator: true }, repoRows) : Txt('No sources yet. Add a public repository.', 18, C.muted, { marginBottom: 9 }), ce(View, { style: { flexDirection: 'row', marginTop: 8 } }, ce(wh.Focusable, { onPress: openRepoEntry, style: { padding: 9, marginRight: 8, borderRadius: 9, backgroundColor: '#17634f' }, focusedStyle: { borderColor: C.white, borderWidth: 2 } }, Txt('＋ ADD SOURCE', 15, C.white)), ce(wh.Focusable, { onPress: removeRepo, style: { padding: 9, marginRight: 8, borderRadius: 9, backgroundColor: '#44252e' }, focusedStyle: { borderColor: C.white, borderWidth: 2 } }, Txt('− REMOVE ACTIVE', 15, C.white)), ce(wh.Focusable, { onPress: function () { setManagerOpen(false); }, style: { padding: 9, borderRadius: 9, backgroundColor: C.panel2 }, focusedStyle: { borderColor: C.white, borderWidth: 2 } }, Txt('CLOSE', 15, C.white)))) : null;
    var editor = editorOpen ? ce(View, { style: { position: 'absolute', left: 14, right: 14, top: 52, bottom: 16, zIndex: 21, padding: 15, borderRadius: 15, borderWidth: 2, borderColor: C.cyan, backgroundColor: '#101827', justifyContent: 'center' } }, Txt('ADD A GITHUB REPOSITORY', 21, C.white, { fontWeight: 'bold' }), Txt('Paste a public repository URL or raw catalog.json URL.', 15, C.muted, { marginTop: 7, marginBottom: 10 }), TextInput ? ce(TextInput, { value: draft, onChangeText: function (v) { setDraft(String(v || '').slice(0, 220)); setRepoError(''); }, onSubmitEditing: addRepo, keyboardType: 'url', returnKeyType: 'done', maxLength: 220, autoFocus: false, placeholder: 'https://github.com/owner/repo', placeholderTextColor: '#a8b5c9', style: { minHeight: 52, paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#254366', color: '#ffffff', fontSize: 18 } }) : Txt('Text entry is unavailable in this bridge.', 15, C.gold), repoError ? Txt(repoError, 15, C.gold, { marginTop: 8 }) : null, ce(View, { style: { flexDirection: 'row', marginTop: 12 } }, ce(wh.Focusable, { onPress: addRepo, style: { padding: 10, marginRight: 9, borderRadius: 9, backgroundColor: '#17634f' }, focusedStyle: { borderColor: C.white, borderWidth: 2 } }, Txt('ADD REPOSITORY', 15, C.white)), ce(wh.Focusable, { onPress: cancelRepoEntry, style: { padding: 10, borderRadius: 9, backgroundColor: '#a8323e', borderWidth: 1, borderColor: '#ff6472' }, focusedStyle: { borderColor: C.white, borderWidth: 2 } }, Txt('△  CANCEL', 15, C.white, { fontWeight: 'bold' })))) : null;
    return ce(View, { style: { width: props.width || 504, height: props.height || 504, padding: 14, borderRadius: 17, backgroundColor: C.bg, overflow: 'hidden' } },
      ce(View, { style: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 7 } }, ce(View, { style: { flexDirection: 'row', alignItems: 'center' } }, ce(View, { style: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#173e58', alignItems: 'center', justifyContent: 'center', marginRight: 9 } }, Txt('W', 22, C.cyan, { fontWeight: 'bold' })), Txt('WIDGET STORE', 27, C.white, { fontWeight: 'bold' })), Txt(data.loading ? 'SYNC' : String(items.length) + ' WIDGETS', 15, C.cyan, { fontWeight: 'bold' })),
      ce(View, { style: { height: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 } }, Txt('↓  SELECT A WIDGET', 15, C.cyan, { fontWeight: 'bold' })),
      mainPanel,
      ce(View, { style: { height: 30, marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: page === 'details' ? 'center' : 'space-between', borderTopWidth: 1, borderColor: C.line } }, page === 'details' ? Txt('L1  BACK TO LIST', 15, C.muted, { fontWeight: 'bold' }) : [Txt('L1 / R1  BROWSE', 14, C.muted), Txt('X  DETAILS', 14, C.cyan), Txt('□  REFRESH', 14, C.muted)]), overlay, editor);
  }
  wh.register(WidgetStore);
})(globalThis.__wh);
