'use strict';

PassFF.PasswordStore = (function() {
  var environment = {},
      passwordsTree;

  let getFullName = function(node) {
    let parts = [node.value],
      currentAncestor = node.parent;
    while (currentAncestor && currentAncestor.parent) {
      parts.unshift(currentAncestor.value);
      currentAncestor = currentAncestor.parent;
    }
    return parts.join('/');
  };

  let TreeNode = function(value, depth, parent) {
    this.value = value;
    this.depth = depth;
    this.parent = parent;
    this.fullName = getFullName(this);
    this.children = [];
  };

  let traverseTree = function(node, func) {
    // don't yield the node for the root node or any internal nodes
    if (node.parent !== null && node.children.length === 0) {
      func(node);
    }
    node.children.forEach(function(childNode) {
      traverseTree(childNode, func);
    });
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
    return browser.runtime.sendNativeMessage('passff', {command: 'env'})
      .then((result) => {
        environment = PassFF.Utils.reject({
          'HOME': PassFF.Preferences.get('home'),
          'DISPLAY': (result.DISPLAY ? result.DISPLAY : ':0.0'),
          'TREE_CHARSET': 'ISO-8859-1',
          'GNUPGHOME': PassFF.Preferences.get('gnupgHome'),
        }, PassFF.Utils.isBlank);
        return sendNativeMessage().then((passListOutput) => {
          let annotatedLines = cleanAndAnnotateLines(passListOutput),
              rootNode       = new TreeNode(null, 0, null),
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

            let thisNode = new TreeNode(thisLine.name, thisLine.depth, currentParent);
            currentParent.children.push(thisNode);
            previousNode = thisNode;
          }

          log.debug("Password store:", rootNode);
          passwordsTree = rootNode;
          return passwordsTree;
      });
    });
  };

  let coerceDataKey = function(rawKey) {
    let coercedKey = PassFF.Utils.findMapped({
      passwordFieldNames: 'password',
      loginFieldNames:    'username',
      urlFieldNames:      'url',
    }, function(keyName, preferenceName) {
      let fieldNames = PassFF.Preferences.get(preferenceName).split(',');
      if (fieldNames.some((fieldName) => fieldName.trim() === rawKey)) {
        return keyName;
      }
    });
    return coercedKey || rawKey;
  };

  let parsePasswordData = function(passShowOutput) {
    let lines               = passShowOutput.stdout.split('\n'),
        additionalInfoRegex = /^(\S.*?):\s*(\S.*)$/,
        data                = {password: lines[0]};
    PassFF.Utils.each(lines.slice(1), (line) => {
      let match = additionalInfoRegex.exec(line);
      if (match) {
        let key = coerceDataKey(match[1].trim());
        data[key] = match[2].trim();
      }
    });
    return data;
  };

  return {
    load: loadPasswords,

    rootEntries: function() {
      return passwordsTree.children;
    },

    entriesMatchingHostname: function(hostname) {
      let matches = [];
      traverseTree(passwordsTree, function(password) {
        let hostnameParts = hostname.split(/\.(co\.\w\w)?/).filter(Boolean);
        for (let i=0; i < hostnameParts.length - 1; i++) {
          let hostname = hostnameParts.slice(i).join('.'),
              score    = fuzzaldrin.score(password.fullName, hostname) * (hostnameParts.length - 1 - i);
          if (score > 0) {
            matches.push({entry: password, score: score});
            break;
          }
        }
      });
      matches.sort(function(a, b) {
        // sort by score descending (subtraction here is to cause sort to work with numbers)
        return b.score - a.score;
      });
      log.debug("Entries matching URL:", matches);
      return matches.map(PassFF.Utils.property('entry'));
    },

    loadPassword: function(passwordFullName) {
      return sendNativeMessage("show", passwordFullName).then(parsePasswordData);
    },
  };
})();
