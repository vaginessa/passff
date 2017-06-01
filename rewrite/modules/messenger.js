'use strict';

PassFF.Messenger = (function() {
  let Actions = new Set([
    'getContextualPasswords',
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
      switch (request.action) {
        case getAction('getContextualPasswords') :
          return PassFF.getActiveTab().then((tab) => {
            if (!tab || !tab.url || tab.status !== 'complete') return; // DUP 1
            return PassFF.PasswordStore.entriesMatchingHostname(new URL(tab.url).hostname);
          });
      };
    },
  };
})();
