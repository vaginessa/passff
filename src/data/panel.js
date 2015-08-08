/* jshint node: true */
/* global document */
/* global self */
'use strict';

let entryList = document.getElementById('entry-list');

self.port.on('update-root-items', function(items) {
  entryList.innerHTML = '';
  items.forEach(function (item) {
    let entryOption = document.createElement('option');
    entryOption.innerHTML = item.key;

    if (item.fullKey != '..' && item.children.length > 0) {
      entryOption.className = 'entry-group';
      entryOption.innerHTML += '/';
    }

    entryList.appendChild(entryOption);
  });
});
