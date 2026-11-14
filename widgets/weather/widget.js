(function (wh) {
  var React = wh.React;
  var View = wh.View;
  var Text = wh.Text;
  var Image = wh.Image;
  var TextInput = wh.TextInput;
  var ce = React.createElement;
  var C = {
    ink: '#07142b', blue: '#163d70', panel: '#285d8b', edge: '#74b8dc',
    white: '#f6fbff', soft: '#c3d9ec', gold: '#ffd477', amber: '#ffad58',
    moon: '#b9c9ff', green: '#8fe3bb', cyan: '#7ed8ec'
  };
  var placeCache = {};
  var placeRequests = {};

  function txt(value, size, color, style) {
    return ce(Text, { style: [{ color: color || C.white, fontSize: size || 18 }, style || {}] }, String(value));
  }
  function row(children, style) {
    return ce(View, { style: [{ flexDirection: 'row', alignItems: 'center' }, style || {}] }, children);
  }
  function card(children, style) {
    return ce(View, { style: [{ padding: 14, borderRadius: 18, borderWidth: 1, borderColor: C.edge, backgroundColor: C.panel }, style || {}] }, children);
  }
  function weatherIcon(code, isDay) {
    if (code === 0) return isDay ? '☀' : '☾';
    if (code <= 2) return isDay ? '🌤' : '☁';
    if (code === 3) return '☁';
    if (code <= 48) return '〰';
    if (code <= 67 || (code >= 80 && code <= 82)) return '☂';
    if (code >= 95) return 'ϟ';
    return '☁';
  }
  function weatherIconView(code, isDay, size, color, style, assetBase) {
    if (code === 0 && Image && assetBase) {
      var icon = isDay ? 'glyph.png' : 'weather-clear-night-icon.png';
      return ce(Image, {
        source: { uri: assetBase + icon }, resizeMode: 'contain',
        style: [{ width: size, height: size }, style || {}]
      });
    }
    return txt(weatherIcon(code, isDay), size, color, style);
  }
  function weatherBackground(code, isDay) {
    if (code === 0) return isDay ? 'weather-clear-day.jpg' : 'weather-clear-night.jpg';
    if (code <= 3) return 'weather-cloudy.jpg';
    if (code <= 48) return 'weather-fog.jpg';
    if (code <= 67 || (code >= 80 && code <= 82)) return 'weather-rain.jpg';
    if (code <= 86) return 'weather-snow.jpg';
    if (code >= 95) return 'weather-storm.jpg';
    return isDay ? 'weather-clear-day.jpg' : 'weather-clear-night.jpg';
  }
  function condition(code) {
    if (code === 0) return 'Clear sky';
    if (code === 1) return 'Mainly clear';
    if (code === 2) return 'Partly cloudy';
    if (code === 3) return 'Overcast';
    if (code <= 48) return 'Hazy';
    if (code <= 57) return 'Drizzle';
    if (code <= 67) return 'Rain';
    if (code <= 77) return 'Snow';
    if (code <= 82) return 'Rain showers';
    if (code <= 86) return 'Snow showers';
    return 'Thunderstorms';
  }
  function safeNumber(value, suffix) {
    return typeof value === 'number' && isFinite(value) ? Math.round(value) + (suffix || '') : '—';
  }
  function locationClock(date, offsetSeconds) {
    var local = new Date(date.getTime() + offsetSeconds * 1000);
    var hour = local.getUTCHours();
    var minute = local.getUTCMinutes();
    var suffix = hour >= 12 ? 'PM' : 'AM';
    return (hour % 12 || 12) + ':' + (minute < 10 ? '0' : '') + minute + ' ' + suffix;
  }
  function dayName(value) {
    var names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var day = new Date(value + 'T12:00:00Z').getUTCDay();
    return names[day] || '';
  }
  function fetchJson(url) {
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (response) {
      if (!response.ok) throw new Error('Weather service returned HTTP ' + response.status);
      return response.json();
    });
  }
  function getPlace(zip) {
    if (placeCache[zip]) return Promise.resolve(placeCache[zip]);
    if (!placeRequests[zip]) {
      var geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(zip) + '&countryCode=US&count=1&language=en&format=json';
      placeRequests[zip] = fetchJson(geoUrl).then(function (geo) {
        var place = geo && geo.results && geo.results[0];
        if (!place || typeof place.latitude !== 'number' || typeof place.longitude !== 'number') {
          throw new Error('Could not find this location');
        }
        placeCache[zip] = place;
        return place;
      }).catch(function (error) {
        delete placeRequests[zip];
        throw error;
      });
    }
    return placeRequests[zip];
  }
  function getCurrentWeather(zip) {
    return getPlace(zip).then(function (place) {
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(place.latitude) +
        '&longitude=' + encodeURIComponent(place.longitude) +
        '&current=temperature_2m,apparent_temperature,is_day,weather_code' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=6' +
        '&temperature_unit=fahrenheit&timezone=auto';
      return fetchJson(url).then(function (data) {
        return { place: place, current: data.current, daily: data.daily, utcOffsetSeconds: data.utc_offset_seconds };
      });
    });
  }

  function CurrentWeather(props) {
    var config = (props && props.config) || {};
    var settings = (props && props.settings) || {};
    var localPair = React.useState({});
    var localSettings = localPair[0];
    var setLocalSettings = localPair[1];
    function saveSetting(key, value) {
      setLocalSettings(function (current) {
        var next = {};
        for (var name in current) if (Object.prototype.hasOwnProperty.call(current, name)) next[name] = current[name];
        next[key] = value;
        return next;
      });
      if (props && typeof props.onSettingChange === 'function') props.onSettingChange(key, value);
    }
    var hasLocalZip = Object.prototype.hasOwnProperty.call(localSettings, 'zip');
    var hasSavedZip = Object.prototype.hasOwnProperty.call(settings, 'zip');
    var selectedZip = hasLocalZip ? localSettings.zip : (hasSavedZip ? settings.zip : config.zip);
    var zip = /^\d{5}$/.test(selectedZip || '') ? selectedZip : '';
    var zipOptions = [];
    var settingSchema = config.settings || [];
    for (var optionIndex = 0; optionIndex < settingSchema.length; optionIndex++) {
      var schema = settingSchema[optionIndex];
      if (!schema || schema.id !== 'zip' || !schema.options) continue;
      for (var zipIndex = 0; zipIndex < schema.options.length; zipIndex++) {
        var option = schema.options[zipIndex];
        var optionZip = option && typeof option === 'object' ? option.value : option;
        if (/^\d{5}$/.test(String(optionZip || '')) && zipOptions.indexOf(String(optionZip)) < 0) {
          zipOptions.push(String(optionZip));
        }
      }
    }
    var savedZipValue = Object.prototype.hasOwnProperty.call(localSettings, 'zipList') ? localSettings.zipList : settings.zipList;
    var savedZipList = typeof savedZipValue === 'string' ? savedZipValue.split(',') : [];
    for (var savedIndex = 0; savedIndex < savedZipList.length; savedIndex++) {
      var savedZip = String(savedZipList[savedIndex]).trim();
      if (/^\d{5}$/.test(savedZip) && zipOptions.indexOf(savedZip) < 0) zipOptions.push(savedZip);
    }
    if (!zipOptions.length && zip) zipOptions.push(zip);
    if (zip && zipOptions.indexOf(zip) < 0) zipOptions.unshift(zip);
    function changeZip(direction) {
      if (!zipOptions.length) return;
      var index = zipOptions.indexOf(zip);
      if (index < 0) index = 0;
      var next = zipOptions[(index + direction + zipOptions.length) % zipOptions.length];
      saveSetting('zip', next);
    }
    if (wh && typeof wh.onPressed === 'function' && wh.Button) {
      wh.onPressed(wh.Button.L1, function () { changeZip(-1); });
      wh.onPressed(wh.Button.R1, function () { changeZip(1); });
    }
    var editorPair = React.useState(false);
    var zipEditorOpen = editorPair[0];
    var setZipEditorOpen = editorPair[1];
    var draftPair = React.useState('');
    var zipDraft = draftPair[0];
    var setZipDraft = draftPair[1];
    var errorPair = React.useState('');
    var zipEntryError = errorPair[0];
    var setZipEntryError = errorPair[1];
    function saveZipEntry() {
      var entered = String(zipDraft || '').replace(/[^0-9]/g, '').slice(0, 5);
      if (!/^\d{5}$/.test(entered)) {
        setZipEntryError('Enter a five-digit US ZIP code.');
        return false;
      }
      if (zipOptions.indexOf(entered) < 0 && zipOptions.length >= 20) {
        setZipEntryError('The saved list is full (20 ZIP codes).');
        return false;
      }
      if (zipOptions.indexOf(entered) < 0) zipOptions.push(entered);
      saveSetting('zipList', zipOptions.join(','));
      saveSetting('zip', entered);
      setZipEntryError('');
      setZipEditorOpen(false);
      return true;
    }
    function openZipEntry() {
      setZipDraft('');
      setZipEntryError('');
      setTimeout(function () { setZipEditorOpen(true); }, 400);
    }
    function removeZipEntry() {
      if (!zip) {
        wh.log('There is no selected ZIP code to remove.');
        return false;
      }
      var remaining = zipOptions.filter(function (saved) { return saved !== zip; });
      var nextZip = remaining[0] || '';
      saveSetting('zipList', remaining.join(','));
      saveSetting('zip', nextZip);
      wh.log('Removed ZIP ' + zip + '; switched to ' + (nextZip || 'no selected ZIP') + '.');
      setZipEntryError('');
      setZipEditorOpen(false);
      return true;
    }
    if (wh && typeof wh.onSettingAction === 'function') {
      wh.onSettingAction('addZip', openZipEntry);
      wh.onSettingAction('deleteZip', removeZipEntry);
    }
    var pair = React.useState({ loading: true, error: '', result: null, updated: null });
    var state = pair[0];
    var setState = pair[1];
    var clockPair = React.useState(new Date());
    var clock = clockPair[0];
    var setClock = clockPair[1];
    React.useEffect(function () {
      var active = true;
      if (!zip) {
        setState({ loading: false, error: 'Add a ZIP code from Options to show weather.', result: null, updated: null });
        return function () { active = false; };
      }
      setState({ loading: true, error: '', result: null, updated: null });
      function load() {
        getCurrentWeather(zip).then(function (result) {
          if (active) setState({ loading: false, error: '', result: result, updated: new Date() });
        }).catch(function (error) {
          if (active) setState({ loading: false, error: String(error && error.message || 'Weather data is unavailable'), result: null, updated: null });
        });
      }
      load();
      var timer = setInterval(load, 15 * 60 * 1000);
      return function () { active = false; clearInterval(timer); };
    }, [zip]);
    React.useEffect(function () {
      var clockTimer = setInterval(function () { setClock(new Date()); }, 30 * 1000);
      return function () { clearInterval(clockTimer); };
    }, []);

    var width = props.width || 504;
    var height = props.height || 328;
    var place = state.result && state.result.place;
    var current = state.result && state.result.current;
    var daily = state.result && state.result.daily;
    var isDay = current && current.is_day === 1;
    var offset = state.result && typeof state.result.utcOffsetSeconds === 'number'
      ? state.result.utcOffsetSeconds
      : (typeof config.utcOffsetSeconds === 'number' ? config.utcOffsetSeconds : 0);
    var status = state.loading ? 'CONNECTING' : (state.error ? 'OFFLINE' : 'LIVE');
    var statusColor = state.error ? C.amber : C.green;
    var assetBase = config.assetBase || '';
    var backgroundName = current ? weatherBackground(current.weather_code, isDay) : '';
    var body;
    if (state.loading) {
      body = card(row([
        txt('◌', 45, C.cyan, { marginRight: 14 }),
        ce(View, null,
          txt('Loading current weather', 21, C.white, { fontWeight: 'bold' }),
          txt('Connecting to local conditions', 15, C.soft, { marginTop: 6 })
        )
      ]), { flex: 1, justifyContent: 'center', backgroundColor: C.blue });
    } else if (state.error || !current) {
      body = card(ce(View, { style: { flex: 1, justifyContent: 'center' } },
        txt('WEATHER UNAVAILABLE', 18, C.amber, { fontWeight: 'bold' }),
        txt(state.error || 'No current conditions were returned.', 15, C.white, { marginTop: 8 }),
        txt(state.error.indexOf('Add a ZIP code') === 0 ? 'Use Options → Add ZIP code to get started.' : 'Retrying automatically in 15 minutes', 15, C.soft, { marginTop: 7 })
      ), { flex: 1, backgroundColor: C.blue });
    } else {
      var forecast = [];
      if (daily && daily.time) {
        for (var i = 1; i < Math.min(6, daily.time.length); i++) {
          forecast.push(ce(View, { key: 'day-' + i, style: { flex: 1, alignItems: 'center' } },
            txt(dayName(daily.time[i], i), 15, C.soft),
            weatherIconView(daily.weather_code[i], true, 24, C.gold, { marginTop: 1 }, assetBase),
            txt(safeNumber(daily.temperature_2m_max[i], '°') + ' / ' + safeNumber(daily.temperature_2m_min[i], '°'), 15, C.white, { marginTop: 1 })
          ));
        }
      }
      var heroChildren = [];
      heroChildren.push(ce(View, { key: 'weather-copy' },
        txt((place.name || 'Local') + (place.admin1 ? ', ' + place.admin1 : ''), 18, C.white, { fontWeight: 'bold' }),
        row([
          weatherIconView(current.weather_code, isDay, 54, isDay ? C.gold : C.moon, { marginRight: 10 }, assetBase),
          txt(safeNumber(current.temperature_2m, '°'), 72, C.white, { fontWeight: 'bold' })
        ], { marginTop: 1 }),
        row([
          txt(condition(current.weather_code), 18, C.white, { fontWeight: 'bold', flex: 1 }),
          txt('Feels like ' + safeNumber(current.apparent_temperature, '°'), 15, C.white)
        ], { marginTop: 1 })
      ));
      body = ce(View, { style: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: C.edge, backgroundColor: 'transparent', overflow: 'hidden' } },
        ce(View, { style: { height: 160, padding: 10, justifyContent: 'center' } }, heroChildren),
        ce(View, { style: { position: 'absolute', left: 1, right: 1, bottom: 90, height: 100, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: 'transparent' } },
          ce(View, { style: { position: 'absolute', left: 0, right: 0, top: -8, bottom: -8, backgroundColor: C.ink, opacity: 0.62 } }),
          txt('5-DAY FORECAST', 15, C.soft, { fontWeight: 'bold', textAlign: 'center', marginBottom: 1 }),
          row(forecast, { flex: 1 })
        )
      );
    }

    return ce(View, { style: { width: width, height: height, padding: 12, borderRadius: 18, backgroundColor: C.ink, overflow: 'hidden' } },
      Image && assetBase && backgroundName ? ce(Image, { source: { uri: assetBase + backgroundName }, resizeMode: 'cover', style: { position: 'absolute', left: 0, top: 0, width: width, height: height } }) : null,
      Image && assetBase && backgroundName ? ce(View, { style: { position: 'absolute', left: 0, top: 0, width: width, height: height, backgroundColor: C.ink, opacity: 0.46 } }) : null,
      row([
        ce(View, { style: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center', marginRight: 9, overflow: 'hidden' } },
          (Image && assetBase) ? ce(Image, { source: { uri: assetBase + 'glyph.png' }, resizeMode: 'cover', style: { width: 40, height: 40 } }) : txt('☀', 27, C.gold)),
        ce(View, { style: { flex: 1 } },
          row([
            txt(config.title || 'Current Weather', 18, C.white, { fontWeight: 'bold', flex: 1 }),
            txt(status, 15, statusColor, { fontWeight: 'bold' })
          ]),
          row([
            txt('CURRENT CONDITIONS', 15, C.soft, { flex: 1, marginTop: 1 }),
            txt(locationClock(clock, offset), 18, C.white, { fontWeight: 'bold' })
          ])
        ),
      ], { marginBottom: 8 }),
      ce(View, { style: { flex: 1 } }, body),
      zipEditorOpen ? ce(View, { style: { position: 'absolute', left: 18, right: 18, top: 72, bottom: 18, zIndex: 20, padding: 14, borderRadius: 16, borderWidth: 2, borderColor: C.edge, backgroundColor: C.ink, justifyContent: 'center' } },
        txt('ADD A ZIP CODE', 18, C.white, { fontWeight: 'bold', marginBottom: 8 }),
        TextInput ? ce(TextInput, {
          value: zipDraft,
          onChangeText: function (value) { setZipDraft(String(value || '').replace(/[^0-9]/g, '').slice(0, 5)); setZipEntryError(''); },
          onSubmitEditing: saveZipEntry,
          keyboardType: 'numeric',
          returnKeyType: 'done',
          maxLength: 5,
          autoFocus: true,
          showSoftInputOnFocus: true,
          placeholder: '5-digit ZIP',
          placeholderTextColor: C.soft,
          style: { minHeight: 48, paddingHorizontal: 12, borderRadius: 8, backgroundColor: C.blue, color: C.white, fontSize: 24 }
        }) : txt('This bridge does not expose the native text-entry control.', 15, C.amber),
        zipEntryError ? txt(zipEntryError, 15, C.amber, { marginTop: 5 }) : null,
        row([
          ce(wh.Focusable, {
            style: { paddingHorizontal: 12, paddingVertical: 8, marginRight: 10, borderRadius: 8, backgroundColor: C.panel },
            focusedStyle: { borderWidth: 1, borderColor: C.gold },
            onPress: saveZipEntry,
            children: function () { return txt('Save ZIP', 18, C.white, { fontWeight: 'bold' }); }
          }),
          ce(wh.Focusable, {
            style: { paddingHorizontal: 12, paddingVertical: 8, marginRight: 10, borderRadius: 8, backgroundColor: '#34445a' },
            focusedStyle: { borderWidth: 1, borderColor: C.gold },
            onPress: function () { setZipEntryError(''); setZipEditorOpen(false); },
            children: function () { return txt('Cancel', 18, C.white); }
          }),
        ], { marginTop: 10 }),
        txt('Enter a five-digit ZIP code, then choose Save ZIP.', 15, C.soft, { marginTop: 8 })
      ) : null
    );
  }

  wh.register(CurrentWeather);
})(globalThis.__wh);
