(function (wh) {
  var React = wh.React, View = wh.View, Text = wh.Text, ce = React.createElement;
  function StoreSmoke() {
    return ce(View, { style: { width: 504, height: 152, padding: 16, borderRadius: 16, backgroundColor: '#10251f', justifyContent: 'center' } },
      ce(Text, { style: { color: '#7cf3bf', fontSize: 21, fontWeight: 'bold' } }, 'WIDGET STORE TEST'),
      ce(Text, { style: { color: '#f5f8ff', fontSize: 18, marginTop: 8 } }, 'If you can read this, the test widget loaded.'),
      ce(Text, { style: { color: '#9ab5aa', fontSize: 15, marginTop: 4 } }, 'GitHub catalog + package path check'));
  }
  wh.register(StoreSmoke);
})(globalThis.__wh);
