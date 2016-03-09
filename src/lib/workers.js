/* jshint node: true */
'use strict';

let self = require('sdk/self');
let simplePrefs = require('sdk/simple-prefs');

let workers = [];

function createWorker(tab) {
  console.log("create worker");
  let worker = tab.attach({
    contentScriptFile: self.data.url('attach.js')
  });
  workers.push(worker);
  worker.on('detach', function removeWorker() {
    console.log("detach worker");
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
  console.log("current morkers", workers);
  for (let i = 0; i < workers.length; i++) {
    if (workers[i].tab == tab) {
      console.log("worker found");
      return workers[i];
    }
  }
  return createWorker(tab);
};
