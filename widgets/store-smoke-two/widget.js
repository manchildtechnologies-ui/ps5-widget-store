(function (wh) {
  var React = wh.React, View = wh.View, Text = wh.Text, ce = React.createElement;
  function StoreSmokeTwo() {
    return ce(View, { style: { width: 504, height: 152, padding: 16, borderRadius: 16, backgroundColor: '#211b37', justifyContent: 'center' } },
      ce(Text, { style: { color: '#c9b7ff', fontSize: 21, fontWeight: 'bold' } }, 'SECOND STORE TEST'),
      ce(Text, { style: { color: '#f5f1ff', fontSize: 18, marginTop: 8 } }, 'Two listings are now in the catalog.'),
      ce(Text, { style: { color: '#b2a6d1', fontSize: 15, marginTop: 4 } }, 'Second package loaded successfully'));
  }
  wh.register(StoreSmokeTwo);
})(globalThis.__wh);
