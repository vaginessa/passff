'use strict';

var log;

(function() {
  let logPrototype = function() {
    this.call(console, "[PassFF]", ...arguments);
  }
  log = {
    debug: logPrototype.bind(console.debug),
    info:  logPrototype.bind(console.info),
    warn:  logPrototype.bind(console.warn),
    error: logPrototype.bind(console.error),
  };
})();

var PassFF = (function() {
  let getActiveTab = function() {
    return browser.tabs.query({active: true, currentWindow: true})
             .then((tabs) => { return tabs[0]; });
  }

  let handleTabUpdate = function() {
    getActiveTab().then((tab) => {
      if (!tab || !tab.url || tab.status !== 'complete') return; // DUP 1

      if (PassFF.Preferences.get('autoFill')) {
        let matches = PassFF.PasswordStore.entriesMatchingHostname(new URL(tab.url).hostname);
        if (matches.length > 0) {
          PassFF.PasswordStore.loadPassword(matches[0].fullName)
            .then((passwordData) => {
              let shouldSubmit = PassFF.Preferences.get('autoSubmit');
              PassFF.Page.enterLogin(passwordData, shouldSubmit, tab.id);
            });
        }
      }
    });
  };

  let hookBrowserEvents = function() {
    browser.tabs.onUpdated.addListener(handleTabUpdate);
    browser.tabs.onActivated.addListener(handleTabUpdate);
    browser.runtime.onMessage.addListener(PassFF.Messenger.dispatch);
  };

  return {
    init: function() {
      log.debug("PassFF.init");
      PassFF.Preferences.load()
        .then(PassFF.PasswordStore.load)
        .then(hookBrowserEvents)
        .then(handleTabUpdate);
    },
    getActiveTab: getActiveTab,
  };
})();
