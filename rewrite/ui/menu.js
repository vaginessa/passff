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

  let translate = PassFF.Utils.translate;

  let displayPasswords = function(passwords) {
    let list = document.getElementById(Ids.entrieslist);
    // empty the list
    while (list.firstChild) list.removeChild(list.firstChild);
    // re-populate it with the new contents
    passwords.forEach(function(password) {
      let listItem = document.createElement('option');
      log.debug("Password object:", password);
      listItem.textContent = password.fullName;
      list.appendChild(listItem);
    });
  };

  let loadAndDisplayContextualPasswords = function() {
    PassFF.Messenger.publish('getContextualPasswords')
      .then(displayPasswords);
  };

  let createStaticMenu = function(doc) {
    let panel = doc.querySelector('body')
    panel.setAttribute('id', Ids.panel);

    let searchBox = doc.querySelector('.searchbar input[type=text]');
    searchBox.setAttribute('id', Ids.searchbox);
    searchBox.setAttribute('placeholder', translate('passff.toolbar.search.placeholder'));
    searchBox.addEventListener('click', function (e) { e.target.select(); });
    searchBox.addEventListener('keypress', PassFF.Menu.onSearchKeypress);
    searchBox.addEventListener('keyup', PassFF.Menu.onSearchKeyup);

    let showAllButton = doc.querySelector('.actions div:nth-child(1) > button');
    showAllButton.setAttribute('id', Ids.rootbutton);
    showAllButton.textContent = translate('passff.button.root.label');
    showAllButton.addEventListener('click', PassFF.Menu.onRootButtonCommand);

    let showMatchingButton = doc.querySelector('.actions div:nth-child(2) > button');
    showMatchingButton.setAttribute('id', Ids.contextbutton);
    showMatchingButton.textContent = translate('passff.button.context.label');
    showMatchingButton.addEventListener('click', loadAndDisplayContextualPasswords);

    let entryList = doc.querySelector('.results select');
    entryList.setAttribute('id', Ids.entrieslist);
    entryList.addEventListener('keydown', PassFF.Menu.onListItemkeydown);

    let refreshButton = doc.querySelector('.actions button.reload');
    refreshButton.setAttribute('id', Ids.refreshmenuitem);
    refreshButton.setAttribute('title', translate('passff.toolbar.refresh.label'));
    refreshButton.addEventListener('click', PassFF.Menu.onRefresh);

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
    },
  };
})();

window.onload = PassFF.Menu.init;
