/* jshint node: true */
/* global document */
/* global self */
'use strict';

let entryList = document.getElementById('entry-list');
let itemStack = [];

self.port.on('update-items', function (items) {
  itemStack = [
    { children: items }  // fake root item
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
  top.children.map(createEntryOption)
              .forEach(entryList.appendChild.bind(entryList));
}

function createEntryOption(item) {
  let entryOption = document.createElement('option');
  entryOption.innerHTML = item.key;
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
        { key: 'Fill',
          activate: self.port.emit.bind(this, 'fill', item)
        },
        { key: 'Fill and Submit',
          activate: self.port.emit.bind(this, 'fill-submit', item)
        },
        { key: 'Goto, fill and submit',
          activate: function () { console.log('Goto, fill and submit stub'); } },
        { key: 'Goto',
          activate: function () { console.log('Goto stub'); } },
        { key: 'Copy login',
          activate: function () { console.log('Copy login stub'); } },
        { key: 'Copy password',
          activate: function () { console.log('Copy password stub'); } }
      ];
      itemStack.push(item);
      updateView();
      item.children = [];
    });
  }

  return entryOption;
}
