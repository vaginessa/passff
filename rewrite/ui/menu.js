'use strict';

PassFF.Menu = (function() {
  let Ids = {
    panel: 'passff-panel',
    button: 'passff-button',
    key: 'passff-key',
    keyset: 'passff-keyset',
    searchbox: 'passff-search-box',
    searchboxlabel: 'passff-search-box-label',
    entrieslist: 'passff-entries-list',
    contextlist: 'passff-context-list',
    optionsmenu: 'passff-options-menu',
    optionsmenupopup: 'passff-options-menupopup',
    rootbutton: 'passff-root-button',
    contextbutton: 'passff-context-button',
    buttonsbox: 'passff-buttonsbox',
    refreshmenuitem: 'passff-refresh-menuitem',
    prefsmenuitem: 'passff-prefs-menuitem',
    newpasswordmenuitem: 'passff-new-password-menuitem',
    menubar: 'passff-menubar',
    menu: 'passff-menu-',
  };

  let Keycodes = {
    RETURN      : 13,
    LEFT_ARROW  : 37,
    UP_ARROW    : 38,
    RIGHT_ARROW : 39,
    DOWN_ARROW  : 40,
  };

  let translate = PassFF.Utils.translate;
  let hideMenu = function() {
    window.close();
  };


  let doToTopResult = function(func) {
    let topResult = document.getElementById(Ids.entrieslist).firstChild;
    if (topResult) func(topResult);
  };

  let createBackItem = function(password) {
    let backItem = document.createElement('option'),
        goBack = PassFF.Utils.partial(displayPasswords, password.children);
    backItem.textContent = "..";
    backItem.addEventListener('click', goBack);
    return backItem;
  };

  let displayPasswords = function(passwords, includeBackButton=true) {
    let list = document.getElementById(Ids.entrieslist);
    // empty the list
    while (list.firstChild) list.removeChild(list.firstChild);
    // re-populate it with the new contents
    // if not a first-level node, include a back button
    if (includeBackButton && passwords[0] && passwords[0].parent && passwords[0].parent.parent) {
      list.appendChild(createBackItem(passwords[0].parent.parent));
    }
    passwords.forEach(function(password) {
      let listItem = document.createElement('option'),
          onClick;
      if (password.children.length > 0) {
        onClick = PassFF.Utils.partial(displayPasswords, password.children);
      } else {
        onClick = PassFF.Utils.partial(displayPasswordActions, password);
      }
      listItem.textContent = `${password.fullName}${password.children.length ? "/" : ""}`;
      listItem.addEventListener('click', onClick);
      list.appendChild(listItem);
    });
  };

  let displayPasswordActions = function(password) {
    let list = document.getElementById(Ids.entrieslist);
    // empty the list
    while (list.firstChild) list.removeChild(list.firstChild);

    // if not a first-level node, include a back button
    if (password.parent) {
      list.appendChild(createBackItem(password.parent));
    }
    let fillItem = document.createElement('option');
    fillItem.textContent = translate('passff.menu.fill');
    fillItem.addEventListener('click', function() {
      PassFF.Messenger.publish('enterLogin', password.fullName, {submit: false})
        .then(hideMenu);
    });
    fillItem.selected = true;

    let fillAndSubmitItem = document.createElement('option');
    fillAndSubmitItem.textContent = translate('passff.menu.fill_and_submit');
    fillAndSubmitItem.addEventListener('click', function() {
      PassFF.Messenger.publish('enterLogin', password.fullName, {submit: true})
        .then(hideMenu);
    });

    let goToItem = document.createElement('option');
    goToItem.textContent = translate('passff.menu.goto');
    goToItem.addEventListener('click', function(event) {
      PassFF.Messenger.publish('goToURL', password.fullName, {
        newWindow: event.ctrlKey || event.metaKey
      }).then(hideMenu);
    });

    let goToAndFillItem = document.createElement('option');
    goToAndFillItem.textContent = translate('passff.menu.goto_fill');
    goToAndFillItem.addEventListener('click', function(event) {
      PassFF.Messenger.publish('goToURL', password.fullName, {
        newWindow: event.ctrlKey || event.metaKey,
      }).then(([passwordData, tabId]) => {
        return PassFF.Messenger.publish('enterLogin', password.fullName, {
          submit: false, passwordData: passwordData, tabId: tabId
        });
      }).then(hideMenu);
    });

    let goToFillAndSubmitItem = document.createElement('option');
    goToFillAndSubmitItem.textContent = translate('passff.menu.goto_fill_and_submit');
    goToFillAndSubmitItem.addEventListener('click', function(event) {
      PassFF.Messenger.publish('goToURL', password.fullName, {
        newWindow: event.ctrlKey || event.metaKey,
      }).then(([passwordData, tabId]) => {
        return PassFF.Messenger.publish('enterLogin', password.fullName, {
          submit: true, passwordData: passwordData, tabId: tabId
        });
      }).then(hideMenu);
    });

    list.appendChild(fillItem);
    list.appendChild(fillAndSubmitItem);
    list.appendChild(goToItem);
    list.appendChild(goToAndFillItem);
    list.appendChild(goToFillAndSubmitItem);
  };

  let loadAndDisplayContextualPasswords = function() {
    PassFF.Messenger.publish('getContextualPasswords')
      .then((passwords) => {
        let includeBackButton = false;
        return displayPasswords(passwords, includeBackButton);
      });
  };
  let loadAndDisplayRootNodes = function() {
    PassFF.Messenger.publish('getRootPasswords')
      .then(displayPasswords);
  };
  let handleSearchKeypress = function(keyupEvent) {
    switch (keyupEvent.keyCode) {
      case Keycodes.RETURN :
        doToTopResult((topResult) => topResult.click());
        break;
      case Keycodes.LEFT_ARROW:
      case Keycodes.RIGHT_ARROW:
      case Keycodes.UP_ARROW:
      case Keycodes.DOWN_ARROW:
        // no-op; let the user move their typing cursor
        break;
      default :
        PassFF.Messenger.publish('getPasswordSearchResults', keyupEvent.target.value)
          .then((passwords) => {
            let includeBackButton = false;
            return displayPasswords(passwords, includeBackButton);
          }).then(() => {
            doToTopResult((topResult) => topResult.selected = true);
          });
    }
  };
  let reloadPlugin = function() {
    PassFF.Messenger.publish('reload');
  };

  let focusSearchBar = function() {
    // autofocus attribute on searchbox doesn't seem to work
    document.getElementById(Ids.searchbox).focus();
  };

  let createStaticMenu = function(doc) {
    let panel = doc.querySelector('body')
    panel.setAttribute('id', Ids.panel);

    let searchBox = doc.querySelector('.searchbar input[type=text]');
    searchBox.setAttribute('id', Ids.searchbox);
    searchBox.setAttribute('placeholder', translate('passff.toolbar.search.placeholder'));
    searchBox.addEventListener('keyup', handleSearchKeypress);

    let showAllButton = doc.querySelector('.actions div:nth-child(1) > button');
    showAllButton.setAttribute('id', Ids.rootbutton);
    showAllButton.textContent = translate('passff.button.root.label');
    showAllButton.addEventListener('click', loadAndDisplayRootNodes);

    let showMatchingButton = doc.querySelector('.actions div:nth-child(2) > button');
    showMatchingButton.setAttribute('id', Ids.contextbutton);
    showMatchingButton.textContent = translate('passff.button.context.label');
    showMatchingButton.addEventListener('click', loadAndDisplayContextualPasswords);

    let entryList = doc.querySelector('.results select');
    entryList.setAttribute('id', Ids.entrieslist);
    entryList.addEventListener('keydown', PassFF.Menu.onListItemkeydown);

    let reloadButton = doc.querySelector('.actions button.reload');
    reloadButton.setAttribute('id', Ids.refreshmenuitem);
    reloadButton.setAttribute('title', translate('passff.toolbar.refresh.label'));
    reloadButton.addEventListener('click', reloadPlugin);

    let prefsButton = doc.querySelector('.actions button.config');
    prefsButton.setAttribute('id', Ids.prefsmenuitem);
    prefsButton.setAttribute('title', translate('passff.toolbar.preferences.label'));
    prefsButton.addEventListener('click', PassFF.Menu.onPreferences);

    let newPasswordButton = doc.querySelector('.actions button.add');
    newPasswordButton.setAttribute('id', Ids.newpasswordmenuitem);
    newPasswordButton.setAttribute('title', translate('passff.toolbar.new_password.label'));
    newPasswordButton.addEventListener('click', PassFF.Menu.onNewPassword);

    return panel;
  };

  return {
    init: function() {
      createStaticMenu(document);
      loadAndDisplayContextualPasswords();
      // focus searchbar -- not sure why, but doesn't work w/o setTimeout
      window.setTimeout(focusSearchBar, 0);
    },
  };
})();

window.onload = PassFF.Menu.init;
