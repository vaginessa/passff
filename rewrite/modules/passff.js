'use strict';

var log;

(function() {
  let logPrototype = function() {
    this.call(console, '[PassFF]', ...arguments);
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
      if (!tab || !tab.url) return;

      log.debug("Location changed:", tab.url);
      if (PassFF.Preferences.get('autoFill')) {
        let matches = PassFF.PasswordStore.entriesMatchingURL(new URL(tab.url).hostname);
        if (matches.length > 0) {
          // TODO: try to auto-fill with the first match
        }
      }
    });
  };

  let hookBrowserEvents = function() {
    browser.tabs.onUpdated.addListener(handleTabUpdate);
    browser.tabs.onActivated.addListener(handleTabUpdate);
  };

  return {
    init: function() {
      log.debug("PassFF.init");
      PassFF.Preferences.load();
      PassFF.PasswordStore.load().then(handleTabUpdate);
      hookBrowserEvents();
    },
  };
})();
