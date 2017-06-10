'use strict';

PassFF.Messenger = (function() {
  let Actions = new Set([
    'getRootPasswords',
    'getContextualPasswords',
    'getPasswordSearchResults',
    'enterLogin',
    'goToURL',
  ]);

  let getAction = function(actionKey) {
    if (Actions.has(actionKey)) {
      return `PassFF:${actionKey}`;
    } else {
      throw new Error(`Invalid message action: ${actionKey}`);
    }
  };

  return {
    publish: function(actionKey) {
      let action = getAction(actionKey);
      return browser.runtime.sendMessage({
        action: action,
        params: Array.prototype.slice.call(arguments, 1),
      }).catch((error) => {
        log.error("Runtime port has crashed:", error);
      });
    },

    dispatch: function(request, sender, sendResponse) {
      let searchTerm, passwordName, submit, passwordData, tabId, promise;
      switch (request.action) {
        case getAction('getContextualPasswords') :
          return PassFF.getActiveTab().then((tab) => {
            if (!tab || !tab.url || tab.status !== 'complete') return; // DUP 1 # maybe the sender (the page) should just pass along the URL so we can avoid the tab finding?
            return PassFF.PasswordStore.entriesMatchingHostname(new URL(tab.url).hostname);
          });
        case getAction('getRootPasswords') :
          return Promise.resolve(PassFF.PasswordStore.rootEntries());
        case getAction('getPasswordSearchResults') :
          searchTerm = request.params[0];
          return Promise.resolve(PassFF.PasswordStore.entriesMatchingSearchTerm(searchTerm));
        case getAction('enterLogin') :
          [passwordName, {submit, passwordData, tabId}] = request.params;
          if (PassFF.Utils.isUndefined(tabId)) {
            promise = PassFF.getActiveTab().then((tab) => {
              if (!tab || !tab.url || tab.status !== 'complete') { // DUP 1
                return Promise.reject("Tab is not valid or not ready");
              } else {
                return Promise.resolve(tab.id);
              }
            });
          } else {
            promise = Promise.resolve(tabId);
          }
          if (PassFF.Utils.isUndefined(passwordData)) {
            promise = promise.then((tabId) => {
              return PassFF.PasswordStore.loadPassword(passwordName)
                .then((passwordData) => [passwordData, tabId]);
            });
          } else {
            promise = promise.then((tabId) => [passwordData, tabId]);
          }
          return promise.then(([passwordData, tabId]) => {
            return PassFF.Page.enterLogin(passwordData, submit, tabId);
          });
        case getAction('goToURL') :
          passwordName = request.params[0];
          return PassFF.PasswordStore.loadPassword(passwordName)
            .then((passwordData) => {
              // TODO: handle error if passwordData doesn't have url
              return browser.tabs.create({url: passwordData.url})
                .then((tab) => [passwordData, tab.id]);
            });
      };
    },
  };
})();
