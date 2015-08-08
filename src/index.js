var buttons = require('sdk/ui/button/action');
var data = require('sdk/self').data;
var pass = require('lib/pass');

var panel = require('sdk/panel').Panel({
  contentURL: data.url('panel.html'),
  contentScriptFile: data.url('panel.js')
});

var button = buttons.ActionButton({
  id: 'passff-button',
  label: 'PassFF',
  icon: {
    '16': './img/icon-16.png',
    '32': './img/icon-32.png',
    '64': './img/icon-64.png',
    '128': './img/icon-128.png'
  },
  onClick: function() {
    panel.show({ position: button });
  }
});

panel.port.emit('update-root-items', pass.getRootItems());

