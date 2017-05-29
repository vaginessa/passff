'use strict';

PassFF.PasswordStore = (function() {
  var environment = {};

  let TreeNode = function(value, depth, parent) {
    return {
      value: value,
      depth: depth,
      parent: parent,
      children: [],
    };
  };

  let sendNativeMessage = function(...args) {
    let params, result, overrides = {};
    if (typeof args[args.length - 1] === 'object') {
      overrides = args.pop();
    }

    if (PassFF.Preferences.get('callType') === 'direct') {
      params = {
        command: PassFF.Preferences.get('command'),
        arguments: args,
        environment: environment,
        charset: 'UTF-8',
        mergeStderr: false
      };
    } else { // through shell
      params = {
        command: PassFF.Preferences.get('shell'),
        arguments: [
          ...PassFF.Preferences.get('shellArgs'),
          PassFF.Preferences.get('command'),
          ...PassFF.Preferences.get('commandArgs'),
          ...args,
        ],
      };
    }

    Object.assign(params, overrides);

    log.debug("Sending native message:", params);
    return browser.runtime.sendNativeMessage('passff', params)
      .then((result) => {
        if (result.exitCode !== 0) {
          log.warn("Native message failed:", result.exitCode, result.stderr, result.stdout);
        }
        return result;
      }, (ex) => {
        log.error("Error sending native message:", ex);
        return {exitCode: -1};
      });
  };

  let cleanAndAnnotateLines = function(passListOutput) {
    let cleanLines  = [],
        outputLines = passListOutput.stdout.replace(/&middot;|`/g, '|').split('\n'),
        depthRegex  = /(\|-- |\|   |    )/g,
        nameRegex   = /\|\-\- (.*)/;
    PassFF.Utils.each(outputLines, function(line, i) {
      if (nameRegex.test(line)) {
        let name = nameRegex.exec(line)[1];
        if (cleanLines.length > 0) {
          let lastLine = cleanLines[cleanLines.length -1],
              depth    = line.match(depthRegex).length;
          cleanLines.push({name: name, depth: depth});
        } else {
          cleanLines.push({name: name, depth: 1});
        }
      }
    });
    return cleanLines;
  };

  let loadPasswords = function() {
    browser.runtime.sendNativeMessage('passff', {command: 'env'})
      .then((result) => {
        environment = PassFF.Utils.reject({
          'HOME': PassFF.Preferences.get('home'),
          'DISPLAY': (result.DISPLAY ? result.DISPLAY : ':0.0'),
          'TREE_CHARSET': 'ISO-8859-1',
          'GNUPGHOME': PassFF.Preferences.get('gnupgHome'),
        }, PassFF.Utils.isBlank);
        sendNativeMessage().then((passListOutput) => {
          let annotatedLines = cleanAndAnnotateLines(passListOutput),
              rootNode       = TreeNode(null, 0, null),
              currentParent  = rootNode,
              previousNode   = null;

          for (let i=0; i < annotatedLines.length; i++) {
            let thisLine = annotatedLines[i];

            if (thisLine.depth > currentParent.depth + 1) {
              currentParent = previousNode;
            } else if (thisLine.depth < currentParent.depth + 1) {
              while (thisLine.depth < currentParent.depth + 1) {
                currentParent = currentParent.parent;
              }
            }

            let thisNode = TreeNode(thisLine.name, thisLine.depth, currentParent);
            currentParent.children.push(thisNode);
            previousNode = thisNode;
          }

          log.debug("Password store:", rootNode);
          return rootNode;
      });
    });
  };

  return {
    load: loadPasswords,
  };
})();
