/* jshint node: true */
'use strict';

let buttons = require('sdk/ui/button/action');
let prefs = require('sdk/simple-prefs').prefs;
let self = require('sdk/self');
let tabs = require('sdk/tabs');

let workers = require('lib/workers');
let pass = require('lib/pass');

let panel = require('sdk/panel').Panel({
  contentURL: self.data.url('panel.html'),
  contentScriptFile: self.data.url('panel.js')
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

panel.port.on('fill', function (item) {
  panel.hide();
  workers.getWorker(tabs.activeTab).port.emit('fill', pass.getPasswordData(item));
});

panel.port.on('fill-submit', function (item) {
  panel.hide();
  workers.getWorker(tabs.activeTab).port.emit('fill-submit', pass.getPasswordData(item));
});

panel.port.emit('update-items', pass.getRootItems());

