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

  let hostCall = function() {
    let result = null;
    let command = null;

    command = PassFF.Preferences.get('command');

    let params = {
      command: command,
      arguments: Array.prototype.slice.call(arguments),
      environment: environment,
      charset: 'UTF-8',
      mergeStderr: false
    };

    log.debug('Execute pass', params);
    return browser.runtime.sendNativeMessage('passff', params)
      .then((result) => {
        if (result.exitCode === 0) {
          log.info('pass script execution ok');
        } else {
          log.warn('pass execution failed', result.exitCode, result.stderr, result.stdout);
        }
        return result;
      }, (ex) => {
        log.error('Error executing pass script', ex);
        return { exitCode: -1 };
      });
  };

  let cleanAndAnnotateLines = function(passListOutput) {
    let cleanLines = [],
        outputLines = passListOutput.stdout.replace(/&middot;|`/g, '|').split('\n'),
        depthRegex = /(\|-- |\|   |    )/g,
        nameRegex   = /\|\-\- (.*)/;
    PassFF.Utils.each(outputLines, function(line, i) {
      if (nameRegex.test(line)) {
        log.debug("Matched name regex:", line);
        let name = nameRegex.exec(line)[1];
        if (cleanLines.length > 0) {
          let lastLine = cleanLines[cleanLines.length -1],
              depth    = line.match(depthRegex).length,
              type     = 'leaf';
          if (depth > lastLine.depth) {
            lastLine.type = 'inode';
          }
          cleanLines.push({type: type,   name: name, depth: depth});
        } else {
          cleanLines.push({type: 'leaf', name: name, depth: 1});
        }
      }
    });
    return cleanLines;
  };

  let loadPasswords = function() {
    browser.runtime.sendNativeMessage("passff", { command: "env" })
      .then((result) => {
        environment = {
          // 'HOME': PassFF.Preferences.get('home'),
          'DISPLAY': (result.DISPLAY ? result.DISPLAY : ':0.0'),
          'TREE_CHARSET': 'ISO-8859-1',
          'GNUPGHOME': PassFF.Preferences.get('gnupgHome'),
        };
        hostCall().then((passListOutput) => {
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

          log.debug("Root node:", rootNode);
          return rootNode;
      });
    });
  };

  return {
    load: loadPasswords,
  };
})();
