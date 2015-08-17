let buttons = require('sdk/ui/button/action');
let self = require('sdk/self');
let tabs = require('sdk/tabs');
let {prefs} = require('sdk/simple-prefs');
let pass = require('lib/pass');

let panel = require('sdk/panel').Panel({
  contentURL: self.data.url('panel.html'),
  contentScriptFile: self.data.url('panel.js')
});

panel.port.on('fill', function (item) {
  panel.hide();
  let data = pass.getPasswordData(item);
  let worker = tabs.activeTab.attach({
    contentScriptFile: self.data.url('attach.js')
  });
  let loginFieldNames = prefs.loginFieldNames.toLowerCase().split(',');
  let passwordFieldNames = prefs.passwordFieldNames.toLowerCase().split(',');
  worker.port.emit('fill', data, loginFieldNames, passwordFieldNames);
});

let button = buttons.ActionButton({
  id: 'passff-button',
  label: 'PassFF',
  icon: {
    '16': './img/icon-16.png',
    '32': './img/icon-32.png',
    '64': './img/icon-64.png',
    '128': './img/icon-128.png'
  },
  onClick: function () {
    panel.show({ position: button });
  }
});

panel.port.emit('update-items', pass.getRootItems());
