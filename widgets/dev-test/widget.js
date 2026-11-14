(function (wh) {
  var React = wh.React, View = wh.View, Text = wh.Text, TextInput = wh.TextInput, ce = React.createElement;
  // Each page mounts at most three action buttons. Dangerous routes require a second confirmation.
  var pages = [
    { title: 'HOME & SETTINGS', items: [['Home','home'],['Settings','settings'],['Language','language']] },
    { title: 'CONTROLS & NETWORK', items: [['Controller','controller'],['Network','network'],['Notifications','notifications']] },
    { title: 'DISPLAY & MEDIA', items: [['Video','video'],['Microphone','microphone'],['Safe Area','safearea',false,'UNSTABLE']] },
    { title: 'SOCIAL & DISC', items: [['Trophies','trophies'],['Remote Play','remoteplay'],['Share Play','shareplay']] },
    { title: 'APP ACTIONS', items: [['Launch App','launchapp',true],['App Info','appinfo',true],['Game Data','gamedata',true]] },
    { title: 'WIDGET REFRESH', items: [['SharePlay Refresh','shareplay']] },
    { title: 'WELCOME HUB TEST', items: [['Open Welcome Hub','launchapp',true,'TEST: NPXS40217',false,'NPXS40217']] },
    { title: 'PATCH & COPYRIGHT', items: [['Update History','updatehistory',true,'UNSTABLE'],['Check Update','checkupdate',true],['Copyright Info','copyright',true,'EXPERIMENTAL']] },
    { title: 'SAVED DATA', items: [['Saved Data','savedata'],['PS4 Saved Data','savedataps4'],['Remove App Dialog','removeappdialog',false,'DANGER',true]] },
    { title: 'HARDWARE & TIME', items: [['Disc Player','discplayer'],['VR Eye Distance','eyedistance',false,'VR ONLY'],['Set Date/Time Now','settime',false,'SYSTEM']] },
    { title: 'DEVELOPER PREVIEWS', items: [['Debug Settings','debugsettings',false,'DEV ONLY'],['Activity Preview','activity',true,'DEV ONLY'],['Activity Config','activityconfig',true,'DEV ONLY']] },
    { title: 'APP DEVELOPMENT', items: [['Workspace Setting','workspace',true,'DEV ONLY'],['Switch Content Config','switchcontent',true,'DEV ONLY'],['PAT Uninstall','patuninstall',true,'DEV ONLY · DANGER',true]] },
    { title: 'SYSTEM / CONTENT', items: [['Initial Setup','initialsetup',false,'SYSTEM · DANGER',true],['Delete Contents','deletecontents',false,'DANGER',true],['Delete Title Content','deletebytitleid',true,'DANGER',true]] },
    { title: 'LOW-LEVEL DIAGNOSTICS', items: [['Core Dump + Continue','coredumpcontinue',true,'DEV ONLY · DANGER',true],['Core Dump + Quit','coredumpquit',true,'DEV ONLY · DANGER',true],['Save Title Snapshot','snapshot',true,'DEV ONLY · DANGER',true]] },
    { title: 'SNAPSHOT / PROCESS', items: [['Revert Title Snapshot','revertsnapshot',true,'DEV ONLY · DANGER',true],['Resume Title','resume',true,'DEV ONLY',true],['Suspend Title','suspend',true,'DEV ONLY',true]] }
  ];
  var C = { white:'#f4f8ff', muted:'#a4b4cc', cyan:'#65ddff', bg:'#080d18', panel:'#121d2e', line:'#35506e', dev:'#29233f', danger:'#48212b', warm:'#41331d' };
  function text(value, size, color, extra) {
    var style = { fontSize:size, color:color };
    if (extra) for (var key in extra) style[key]=extra[key];
    return ce(Text,{style:style},String(value==null?'':value));
  }
  function DevTest() {
    var pagePair=React.useState(0), page=pagePair[0], setPage=pagePair[1];
    var idPair=React.useState(''), titleId=idPair[0], setTitleId=idPair[1];
    var idLoadPair=React.useState(false), idLoaded=idLoadPair[0], setIdLoaded=idLoadPair[1];
    var idDirty=React.useRef(false), saveTimer=React.useRef(null);
    var statusPair=React.useState('L1 / R1 changes page'), status=statusPair[0], setStatus=statusPair[1];
    var pendingPair=React.useState(null), pending=pendingPair[0], setPending=pendingPair[1];
    React.useEffect(function(){
      var alive=true;
      fetch('http://127.0.0.1:8098/__wget?w=dev-test').then(function(response){return response.json();}).then(function(saved){
        if(!alive)return;
        if(!idDirty.current&&saved&&typeof saved.titleId==='string')setTitleId(saved.titleId.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,9));
        setIdLoaded(true);
      }).catch(function(){if(alive)setIdLoaded(true);});
      return function(){alive=false;if(saveTimer.current)clearTimeout(saveTimer.current);};
    },[]);
    function persistTitleId(value){
      var payload=JSON.stringify({titleId:value}),hex='';
      for(var i=0;i<payload.length;i++)hex+=('0'+payload.charCodeAt(i).toString(16)).slice(-2);
      return fetch('http://127.0.0.1:8098/__wset?w=dev-test&h='+hex);
    }
    function step(direction) {
      if (pending) return true;
      var next=(page+direction+pages.length)%pages.length;
      setPage(next); setStatus('L1 / R1 changes page'); return true;
    }
    wh.onPressed(wh.Button.L1,function(){return step(-1);});
    wh.onPressed(wh.Button.R1,function(){return step(1);});
    function launch(item) {
      var id=String(item[5]||titleId||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,9);
      if (item[2] && !/^[A-Z0-9]{9}$/.test(id)) { setStatus('Enter a 9-character Title ID first.'); return true; }
      setPending(null); setStatus('Opening '+item[0]+'…');
      var url='http://127.0.0.1:8098/__launch?action='+encodeURIComponent(item[1])+(item[2]?'&titleId='+encodeURIComponent(id):'');
      if(saveTimer.current){clearTimeout(saveTimer.current);saveTimer.current=null;}
      var saved=(!item[5]&&(idLoaded||idDirty.current))?persistTitleId(id).catch(function(){return null;}):Promise.resolve();
      saved.then(function(){return fetch(url);}).then(function(response){return response.json().then(function(body){if(!response.ok||!body||!body.ok)throw new Error(body&&body.error||'Request failed');setStatus('Request accepted: '+item[0]);});})
        .catch(function(error){setStatus('Failed: '+(error&&error.message||'bridge request error'));});
      return true;
    }
    function choose(item) {
      if (item[4]) { setPending(item); setStatus('Review the warning, then confirm or cancel.'); return true; }
      return launch(item);
    }
    function makeButton(label, key, action, kind) {
      var bg=kind==='danger'?C.danger:kind==='dev'?C.dev:kind==='warm'?C.warm:C.panel;
      var border=kind==='danger'?'#ff727f':kind==='dev'?'#9e82db':kind==='warm'?'#d5ad61':C.line;
      return ce(wh.Focusable,{key:key,onPress:action,style:{minHeight:62,marginTop:8,paddingHorizontal:14,borderRadius:15,borderWidth:1,borderColor:border,backgroundColor:bg,justifyContent:'center',alignItems:'center'},focusedStyle:{borderColor:'#ffffff',borderWidth:3}},
        text(label,kind==='danger'?18:21,C.white,{fontWeight:'bold',textAlign:'center'}));
    }
    var current=pages[page], appPage=current.items.some(function(item){return !!item[2]&&!item[5];});
    var buttons;
    if (pending) {
      buttons=[
        makeButton('CANCEL','cancel',function(){setPending(null);setStatus('Cancelled.');return true;},'normal'),
        makeButton('CONFIRM: '+pending[0],'confirm',function(){return launch(pending);},'danger')
      ];
    } else {
      buttons=current.items.map(function(item){
        var kind=item[4]?'danger':(item[3]&&item[3].indexOf('DEV')>=0?'dev':(item[3]&&(item[3].indexOf('UNSTABLE')>=0||item[3].indexOf('EXPERIMENTAL')>=0)?'warm':'normal'));
        var label='X   '+item[0]+(item[3]?'  ['+item[3]+']':'');
        return makeButton(label,item[1],function(){return choose(item);},kind);
      });
    }
    return ce(View,{style:{flex:1,padding:18,backgroundColor:C.bg}},
      ce(View,{style:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:5}},text('DEV TEST',24,C.cyan,{fontWeight:'bold'}),text((page+1)+' / '+pages.length,18,C.muted)),
      text(pending?'CONFIRM ACTION':current.title,18,pending?'#ff8893':C.white,{fontWeight:'bold',marginBottom:3}),
      text('L1 / R1 changes page',15,C.muted,{marginBottom:appPage?4:6}),
      appPage?(TextInput?ce(TextInput,{value:titleId,onChangeText:function(value){var next=String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,9);idDirty.current=true;setTitleId(next);if(saveTimer.current)clearTimeout(saveTimer.current);saveTimer.current=setTimeout(function(){persistTitleId(next).then(function(){saveTimer.current=null;},function(){saveTimer.current=null;});},300);},maxLength:9,placeholder:idLoaded?'9-character Title ID (remembered)':'Loading saved Title ID…',placeholderTextColor:'#9aaac1',style:{height:42,paddingHorizontal:12,borderRadius:10,borderWidth:1,borderColor:C.line,backgroundColor:'#18263b',color:'#ffffff',fontSize:18,marginBottom:2}}):text('Text input is unavailable.',15,'#ff8893')):null,
      text(pending?'This action can affect system, app, or saved state.':(current.items.some(function(item){return !!item[4];})?'DANGER actions ask for confirmation.':status),15,pending?'#ffb4bb':C.muted,{marginTop:2,minHeight:21,textAlign:'center'}),
      buttons,
      text(status,15,C.muted,{marginTop:8,minHeight:21,textAlign:'center'}));
  }
  wh.register(DevTest);
})(globalThis.__wh);
