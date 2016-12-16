/* jshint node: true */
/* global log */
'use strict';

let {subprocess} = require('./subprocess.jsm');
let {prefs} = require('sdk/simple-prefs');
let {URL} = require('sdk/url');

let Item = function (depth, key, parentFullKey) {
  this.children = [];
  this.depth = depth;
  this.key = key;
  this.parentFullKey = parentFullKey;
  this.fullKey = parentFullKey == null ? key : parentFullKey + '/' + key;
}

Item.prototype.isLeaf = function () {
  return this.children.length === 0;
};

Item.prototype.hasFields = function () {
  return this.children.some(function (element) {
    return element.isField();
  });
};

Item.prototype.isField = function () {
  return this.isLeaf() && (isLoginField(this.key) || isPasswordField(this.key) || isUrlField(this.key));
};

let items = [];
let rootItems = [];

subprocess.registerDebugHandler(function (m) {
  console.debug('[subprocess] ' + m);
});

subprocess.registerLogHandler(function (m) {
  console.error('[subprocess] ' + m);
});

reloadItems();

function reloadItems() {
  console.log("reloadItems");
  let result = executePass([]);
  if (result.exitCode !== 0) {
    return;
  }

  rootItems = [];
  items = [];

  let stdout = result.stdout;
  // replace utf8 box characters with traditional ascii tree
  stdout = stdout.replace(/[\u2514\u251C]\u2500\u2500/g, '|--');
  //remove colors
  stdout = stdout.replace(/\x1B\[[^m]*m/g, '');

  let lines = stdout.split('\n');
  let re = /(.*[|`;])+-- (.*)/;
  let currentParent = null;

  for (let i = 0; i < lines.length; i++) {
    let match = re.exec(lines[i]);

    if (!match) {
      continue;
    }

    let currentDepth = (match[1].replace('&middot;', '`').length - 1) / 4;
    let key = match[2].replace(/\\ /g, ' ').replace(/ -> .*/g, '');

    while (currentParent !== null && currentParent.depth >= currentDepth) {
      currentParent = getItemByFullKey(currentParent.parentFullKey);
    }

    let item = new Item(currentDepth, key, currentParent == null ? null : currentParent.fullKey);

    if (currentParent !== null) {
      currentParent.children.push(item);
    }

    currentParent = item;
    items.push(item);

    if (item.depth === 0) {
      rootItems.push(item);
    }
  }
  console.debug('Found Items', rootItems);
}

function getPasswordData(item) {
  let result = {};

  if (item.children.length === 0) { // multiline-style item
    let args = [item.fullKey];
    let executionResult = executePass(args);

    if (executionResult.exitCode !== 0) {
      console.error('Pass execution failed:', executionResult);
      return;
    }

    let lines = executionResult.stdout.split('\n');
    result.password = lines[0];

    for (let i = 1; i < lines.length; i++) {
      let line = lines[i];
      let splitPos = line.indexOf(':');

      if (splitPos >= 0) {
        let attributeName = line.substring(0, splitPos).toLowerCase();
        let attributeValue = line.substring(splitPos + 1);
        result[attributeName] = attributeValue.trim();
      }
    }
    result.fullText = executionResult.stdout;
  } else { // hierarchical-style item
    item.children.forEach(function (child) {
      if (child.isField()) {
        result[child.key] = getPasswordData(child).password;
      }
    });
  }

  return {
    'login': getLogin(result, item.key),
    'password': getPassword(result),
    'url': result.url,
    'fullText': result.fullText
  };
}

function getPassword(passwordData) {
  let password;
  let passwordFields = prefs.passwordFieldNames.toLowerCase().split(',');

  for (let i = 0; i < passwordFields.length; i++) {
    if (passwordData.hasOwnProperty(passwordFields[i])) {
      return passwordData[passwordFields[i]];
    }
  }

  return '';
}

function getLogin(passwordData, key) {
  let login;
  let loginFields = prefs.loginFieldNames.toLowerCase().split(',');

  for (let i = 0; i < loginFields.length; i++) {
    if (passwordData.hasOwnProperty(loginFields[i])) {
      return passwordData[loginFields[i]];
    }
  }

  return key;
}

function isLoginField(name) {
  return prefs.loginFieldNames.indexOf(name) >= 0;
}

function isPasswordField(name) {
  return prefs.passwordFieldNames.indexOf(name) >= 0;
}

function isUrlField(name) {
  return prefs.urlFieldNames.indexOf(name) >= 0;
}

function getMatchingItems(search, limit) {
  let searchRegex = '';

  for (let i = 0; i < search.length; i++) {
    searchRegex += search.charAt(i) + '.*';
  }

  let BreakException = {};
  let matches = [];

  try {
    items.forEach(function(item) {
      let flags = prefs.caseInsensitiveSearch ? 'i' : '';
      let regex = new RegExp(searchRegex, flags);

      if ((item.isLeaf() || item.hasFields()) && item.fullKey.search(regex) >= 0) {
        matches.push(item);
      }

      if (matches.length == limit) {
        throw BreakException;
      }
    });
  } catch (e) {
    if (e !== BreakException) {
      throw e;
    }
  }
  return matches;
}

function getItemByFullKey(fullKey) {
  let foundItem = items.find(function(item) {
    return item.fullKey == fullKey;
  })
  return (typeof foundItem == 'undefined') ? null : foundItem;
}

function getUrlMatchingItems(urlStr) {
  let url = new URL(urlStr);
  console.debug('Search items for:', url);

  let matchingItems = items.map(function(item) {
    return getItemQuality(item, urlStr);
  }).filter(function(item) {
    return item.quality >= 0;
  }).sort(function(item1, item2) {
    return item2.quality - item1.quality;
  }).map(function(item) {
    return item.item;
  });

  console.debug('Matching items:', matchingItems);

  return matchingItems;
}

function getItemQuality(item, urlStr) {
  let noMatch = {item: null, quality: -1};
  let url = new URL(urlStr);
  let hostGroupToMatch = url.host || url.href;
  let hostGroupToMatchSplit = hostGroupToMatch.split('\.');
  let tldName = '';
  if (hostGroupToMatchSplit.length >= 2) {
    tldName = hostGroupToMatchSplit[hostGroupToMatchSplit.length - 1];
  }
  do {
    let itemQuality = hostGroupToMatch.split('\.').length * 100 +
      hostGroupToMatch.split('\.').length;
    let hostToMatch = hostGroupToMatch;

    do {
      if (hostToMatch == tldName) {
        break;
      }

      let regex = new RegExp(hostToMatch.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
      if (item.fullKey.search(regex) >= 0) {
        return {item: item, quality: itemQuality};
      }

      if (hostToMatch.indexOf('.') < 0) {
        break;
      }

      hostToMatch = hostToMatch.replace(/[^\.]+\./, '');
      itemQuality--;
    } while (true);

    if (hostGroupToMatch.indexOf('.') < 0) {
      break;
    }
    hostGroupToMatch = hostGroupToMatch.replace(/\.[^\.]+$/, '');

  } while (true);

  return noMatch;
}

function getItemsLeafs(items) {
  let leafs = [];
  items.forEach(function(item) {
    leafs = leafs.concat(getItemLeafs(item));
  });
  return leafs;
}

function getItemLeafs(item) {
  let leafs = [];

  if (item.isLeaf()) {
    if (!item.isField()) {
      leafs.push(item);
    }
  } else {
    item.children.forEach(function(child) {
      leafs = leafs.concat(getItemLeafs(child));
    });
  }

  return leafs;
}

function executePass(args) {
  let result = null;
  let scriptArgs = [];
  let command = null;
  let environment = [
    'HOME=' + require('sdk/system/environment').env.HOME,
    'DISPLAY=:0.0',
    'TREE_CHARSET=ISO-8859-1'
  ];

  if (prefs.callType == 'direct') {
    command = prefs.command;
    environment = environment.concat(getDirectEnvParams());
    prefs.commandArgs.split(' ').forEach(function(value) {
      if (value && value.trim().length > 0) {
        scriptArgs.push(value);
      }
    });

    args.forEach(function(value) {
      scriptArgs.push(value);
    });
  } else { // through shell
    command = prefs.shell;
    let passCmd = prefs.command;
    prefs.commandArgs.split(' ').forEach(function(value) {
      if (value && value.trim().length > 0) {
        passCmd += ' ' + value;
      }
    });
    args.forEach(function(val) {
      passCmd += ' ' + val;
    });
    prefs.shellArgs.split(' ').forEach(function(value) {
      if (value.trim().length > 0) {
        scriptArgs.push(value);
      }
    });
    scriptArgs.push('-c');
    scriptArgs.push(passCmd.trim());
  }

  try {
    let params = {
      command: command,
      arguments: scriptArgs,
      environment: environment,
      charset: 'UTF-8',
      mergeStderr: false,
      done: function(data) {
        result = data;
      }
    };
    console.log('Execute pass', params);

    let p = subprocess.call(params);

    p.wait();
    if (result.exitCode !== 0) {
      console.log('pass execution failed', result.exitCode, result.stderr, result.stdout);
    } else {
      console.log('pass script execution ok');
    }
  } catch (ex) {
    // TODO show error message on execution failure
    // PassFF.Pass._promptService.alert(null, 'Error executing pass script', ex.message);
    console.error('Error executing pass script', ex);
    result = { exitCode: -1 };
  }
  return result;
}

function getDirectEnvParams() {
  let params = [];
  if (prefs.path && prefs.path.trim().length > 0) {
    params.push('PATH=' + prefs.path);
  }

  if (prefs.storeDir && prefs.storeDir.trim().length > 0) {
    params.push('PASSWORD_STORE_DIR=' + prefs.storeDir);
  }

  if (prefs.gpgAgentEnv !== null) {
    params.push(prefs.gpgAgentEnv);
  }

  return params;
}

exports.getPasswordData = getPasswordData;
exports.getRootItems = function() {
  return rootItems;
};
exports.getMatchingItems = getMatchingItems;
exports.getUrlMatchingItems = getUrlMatchingItems;
exports.reloadItems = reloadItems;
