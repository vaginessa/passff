/* jshint node: true */
'use strict';

let self = require('sdk/self');
let simplePrefs = require('sdk/simple-prefs');

let workers = [];

function createWorker(tab) {
  let worker = tab.attach({
    contentScriptFile: self.data.url('attach.js')
  });
  workers.push(worker);
  worker.on('detach', function removeWorker() {
    for (let i = 0; i < workers.length; i++) {
      if (workers[i] == worker) {
        workers.splice(i, 1);
        break;
      }
    }
  });
  worker.port.emit('update-prefs', simplePrefs.prefs);
  return worker;
}

simplePrefs.on('change', function () {
  workers.forEach(function (worker) {
    worker.port.emit('update-prefs', simplePrefs.prefs);
  });
});

exports.getWorker = function (tab) {
  for (let i = 0; i < workers.length; i++) {
    if (workers[i].tab == tab) {
      return workers[i];
    }
  }
  return createWorker(tab);
};
