'use strict';

var log = {
  generateArguments: function(args) {
    var argsArray = Array.slice(args);
    argsArray.unshift('[PassFF]');
    return argsArray;
  }
};

(function() {
  function logPrototype() {
    if (PassFF.Preferences) {
      // jshint validthis: true
      this.apply(console, log.generateArguments(arguments));
    }
  }
  log.debug = logPrototype.bind(console.debug);
  log.info  = logPrototype.bind(console.info);
  log.warn  = logPrototype.bind(console.warn);
  log.error = logPrototype.bind(console.error);
})();

var PassFF = (function() {
  let init = function() {
    log.debug("PassFF.init");
    PassFF.Preferences.load();
    PassFF.PasswordStore.load();
    // hook browser events (page ready, tab change, etc)
  };

  return {
    init: init,
  };
})();
