/* jshint node: true */
/* global document */
/* global self */
'use strict';

let entryList = document.getElementById('entry-list');
let searchForm = document.getElementById('search-form');
let searchBox = document.getElementById('search-box');
let refreshButton = document.getElementById('refresh-button');
let preferencesButton = document.getElementById('preferences-button');
let displayContextualButton = document.getElementById('display-contextual');
let displayAllButton = document.getElementById('display-all');
let itemStack = [];

self.port.on('update-items', function (items) {
  console.log("Updating items");
  itemStack = [
    { children: items } // fake root item
  ];
  updateView();
});

function updateView() {
  entryList.innerHTML = '';

  if (itemStack.length > 1) {
    let upItem = document.createElement('option');
    upItem.innerHTML = '..';
    upItem.addEventListener('click', function () {
      itemStack.pop();
      updateView();
    });
    entryList.appendChild(upItem);
  }

  let top = itemStack[itemStack.length - 1];
  top.children.map(createEntryOption).forEach(entryList.appendChild.bind(entryList));
}

function createEntryOption(item) {
  let entryOption = document.createElement('option');
  entryOption.innerHTML = item.fullKey || item.key; // fullKey for navigation items, key for actions
  entryOption.item = item;

  if (typeof item.children == 'object' && item.children.length > 0) {
    entryOption.innerHTML += '/';
    entryOption.addEventListener('click', function () {
      itemStack.push(item);
      updateView();
    });
  } else if (typeof item.activate == 'function') {
    entryOption.addEventListener('click', item.activate);
  } else {
    entryOption.addEventListener('click', function () {
      item.children = [
        { key: 'Fill', activate: self.port.emit.bind(this, 'fill', item) },
        { key: 'Fill and Submit', activate: self.port.emit.bind(this, 'fill-submit', item) },
        { key: 'Goto, fill and submit', activate:  self.port.emit.bind(this, 'goto-fill-submit', item) },
        { key: 'Goto', activate:  self.port.emit.bind(this, 'goto', item) },
        { key: 'Copy login', activate:  self.port.emit.bind(this, 'copy-login', item) },
        { key: 'Copy password', activate:  self.port.emit.bind(this, 'copy-password', item) }
      ];
      itemStack.push(item);
      updateView();
      item.children = [];
    });
  }

  return entryOption;
}


searchForm.addEventListener('submit', function(event) {
  event.preventDefault();
  console.log("Performing search");
  self.port.emit('search', searchBox.value);
  searchBox.value = "";
});

refreshButton.addEventListener('click', function() {
  self.port.emit('refresh-items', searchBox.value);
});

displayContextualButton.addEventListener('click', function() {
  self.port.emit('display-contextual');
});

displayAllButton.addEventListener('click', function() {
  self.port.emit('display-all');
});
