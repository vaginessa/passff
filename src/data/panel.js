/* jshint node: true */
/* global document */
/* global self */
'use strict';

let entryList = document.getElementById('entry-list');
let searchBox = document.getElementById('search-box');
let refreshButton = document.getElementById('refresh-button');
let preferencesButton = document.getElementById('preferences-button');
let displayContextualButton = document.getElementById('display-contextual');
let displayAllButton = document.getElementById('display-all');
let itemStack = [];

self.port.on('menu-opened', function (items) {
  searchBox.focus();
});

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

  // highlight the top option so that pressing "enter" will select it
  let firstChild = entryList.children[0];
  if (firstChild) firstChild.selected = true;
}

function createEntryOption(item) {
  let entryOption = document.createElement('option');
  entryOption.innerHTML = item.fullKey || item.key; // fullKey for navigation items, key for actions
  entryOption.item = item;

  if (typeof item.children == 'object' && item.children.length > 0) { // directory
    entryOption.innerHTML += '/';
    entryOption.addEventListener('click', function () {
      itemStack.push(item);
      updateView();
    });
  } else if (typeof item.activate == 'function') {                    // password command
    entryOption.addEventListener('click', item.activate);
  } else {
    entryOption.addEventListener('click', function () {               // password
      item.children = [
        { key: 'Fill', activate: self.port.emit.bind(this, 'fill', item) },
        { key: 'Fill and Submit', activate: self.port.emit.bind(this, 'fill-submit', item) },
        { key: 'Goto, fill and submit', activate:  self.port.emit.bind(this, 'goto-fill-submit', item) },
        { key: 'Goto', activate:  self.port.emit.bind(this, 'goto', item) },
        { key: 'Copy login', activate:  self.port.emit.bind(this, 'copy-login', item) },
        { key: 'Copy password', activate:  self.port.emit.bind(this, 'copy-password', item) },
        { key: 'Display', activate:  self.port.emit.bind(this, 'display-password', item) }
      ];
      itemStack.push(item);
      updateView();
      item.children = [];
    });
  }

  return entryOption;
}


searchBox.addEventListener('keydown', function(event) {
  // Ignore 'enter' and the arrow keys
  if ([13, 37, 38, 39, 40].indexOf(event.keyCode) < 0) {
    self.port.emit('search', searchBox.value);
  }
});

document.addEventListener('keydown', function(event) {
  switch (event.keyCode) {
    case 13:
      // Pressed 'enter'
      // If a password entry, perform configured enter behavior
      // otherwise, trigger a click
      let selected = entryList.options[entryList.selectedIndex];
      if (selected && selected.item.children.length === 0) {
        self.port.emit('enter-pressed', selected.item);
        // console.debug("emitted enter-pressed");
      } else if (selected) {
        selected.click();
      }
      break;
    case 38:
      // Pressed 'up arrow'
      // If select box isn't active, move the selection up one, unless you're at the top
      if (document.activeElement !== entryList && entryList.selectedIndex > 0) {
        entryList.selectedIndex -= 1;
      }
      break;
    case 40: // 'down arrow'
      // Pressed 'down arrow'
      // If select box isn't active, move the selection down one, unless you're at the bottom
      if (document.activeElement !== entryList && entryList.selectedIndex < entryList.options.length - 1) {
        entryList.selectedIndex += 1;
      }
      break;
  }
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
