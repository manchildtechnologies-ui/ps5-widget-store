(function (wh) {
  var React = wh.React;
  var View = wh.View;
  var Text = wh.Text;
  var ce = React.createElement;
  var FONT = wh.FontSize || {};
  var F = {
    display: FONT.SizeLarge || 36,
    key: FONT.SizeXSmall || 24,
    small: FONT.Size3XSmall || 18
  };

  function calculate(left, right, operator) {
    if (operator === '+') return left + right;
    if (operator === '−') return left - right;
    if (operator === '×') return left * right;
    if (operator === '÷') return right === 0 ? null : left / right;
    return right;
  }

  function Calculator(props) {
    var displayPair = React.useState('0');
    var display = displayPair[0];
    var setDisplay = displayPair[1];
    var storedPair = React.useState(null);
    var stored = storedPair[0];
    var setStored = storedPair[1];
    var operatorPair = React.useState(null);
    var operator = operatorPair[0];
    var setOperator = operatorPair[1];
    var replacePair = React.useState(true);
    var replaceDisplay = replacePair[0];
    var setReplaceDisplay = replacePair[1];
    var focusPair = React.useState('');
    var focusedKey = focusPair[0];
    var setFocusedKey = focusPair[1];

    function showNumber(value) {
      if (value === null || !isFinite(value)) {
        setDisplay('Error');
        setStored(null);
        setOperator(null);
        setReplaceDisplay(true);
        return;
      }
      var rounded = Math.round(value * 10000000000) / 10000000000;
      setDisplay(String(rounded));
    }

    function press(key) {
      if (key >= '0' && key <= '9') {
        if (display === 'Error' || replaceDisplay) {
          setDisplay(key);
          setReplaceDisplay(false);
        } else if (display.length < 14) {
          setDisplay(display === '0' ? key : display + key);
        }
        return;
      }
      if (key === 'AC') {
        setDisplay('0'); setStored(null); setOperator(null); setReplaceDisplay(true);
        return;
      }
      if (key === '±') {
        if (display !== '0' && display !== 'Error') setDisplay(display.charAt(0) === '-' ? display.slice(1) : '-' + display);
        return;
      }
      if (key === '%') {
        if (display !== 'Error') { showNumber(Number(display) / 100); setReplaceDisplay(true); }
        return;
      }
      if (key === '⌫') {
        if (display === 'Error' || replaceDisplay) return;
        var shortened = display.slice(0, -1);
        setDisplay(shortened === '' || shortened === '-' ? '0' : shortened);
        return;
      }
      if (key === '.') {
        if (display === 'Error' || replaceDisplay) { setDisplay('0.'); setReplaceDisplay(false); }
        else if (display.indexOf('.') === -1) setDisplay(display + '.');
        return;
      }
      if (key === '=') {
        if (operator && stored !== null && display !== 'Error') {
          showNumber(calculate(stored, Number(display), operator));
          setStored(null); setOperator(null); setReplaceDisplay(true);
        }
        return;
      }
      if (key === '+' || key === '−' || key === '×' || key === '÷') {
        if (display === 'Error') return;
        var current = Number(display);
        if (operator && stored !== null && !replaceDisplay) {
          current = calculate(stored, current, operator);
          if (current === null || !isFinite(current)) { showNumber(null); return; }
          showNumber(current);
        }
        setStored(current);
        setOperator(key);
        setReplaceDisplay(true);
      }
    }

    var rows = [
      ['AC', '±', '%', '÷'],
      ['7', '8', '9', '×'],
      ['4', '5', '6', '−'],
      ['1', '2', '3', '+'],
      ['⌫', '0', '.', '=']
    ];
    var children = [];
    for (var r = 0; r < rows.length; r++) {
      var rowKeys = rows[r];
      var cells = [];
      for (var c = 0; c < rowKeys.length; c++) {
        (function (key) {
          var isOperator = key === '÷' || key === '×' || key === '−' || key === '+' || key === '=';
          var isUtility = key === 'AC' || key === '±' || key === '%' || key === '⌫';
          var selected = focusedKey === key;
          cells.push(ce(View, {
            key: key,
            focusable: true,
            onFocus: function () { setFocusedKey(key); },
            onBlur: function () { if (focusedKey === key) setFocusedKey(''); },
            onPress: function () { press(key); },
            style: {
              flex: 1,
              height: 32,
              margin: 3,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? '#5a91ff' : (isOperator ? '#345da6' : (isUtility ? '#30343c' : '#22262d')),
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? '#ffffff' : '#414751'
            }
          }, ce(Text, { style: { fontSize: key === 'AC' || key === '⌫' ? F.small : F.key, color: '#ffffff', fontWeight: 'bold' } }, key)));
        })(rowKeys[c]);
      }
      children.push(ce(View, { key: 'row-' + r, style: { flexDirection: 'row', height: 38 } }, cells));
    }

    return ce(View, {
      style: {
        width: props.width || 504,
        height: props.height || 328,
        padding: 12,
        borderRadius: 16,
        backgroundColor: '#17191e'
      }
    },
      ce(wh.Title, { iconId: 'wh:calculator' }, 'Calculator'),
      ce(View, {
        style: {
          height: 50,
          marginTop: 5,
          marginBottom: 3,
          paddingHorizontal: 12,
          borderRadius: 10,
          backgroundColor: '#0d0f12',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }
      }, ce(Text, { numberOfLines: 1, style: { fontSize: F.display, color: '#ffffff', fontWeight: 'bold' } }, display)),
      ce(View, { style: { flex: 1, justifyContent: 'center' } }, children)
    );
  }

  wh.register(Calculator);
})(globalThis.__wh);
