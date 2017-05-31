PassFF.Page = (function() {
  let executeScript = function(tabId, code) {
    return browser.tabs.executeScript(tabId, {code: code, runAt: 'document_idle'});
  };

  let TemplateStrings = {
    fillOutLoginForm: function(passwordData, shouldSubmit) {
      return `(function() {
  let isPasswordInput = function(element) {
    let nameOrIdMatches = ${JSON.stringify(PassFF.Preferences.get('passwordInputNames'))}.split(',');
    return element.type === 'password' ||
             nameOrIdMatches.some((regexStr) => {
               let regex = new RegExp(regexStr);
               return regex.test(element.name) || regex.test(element.id);
             });
  };

  let isUsernameInput = function(element) {
    let nameOrIdMatches = ${JSON.stringify(PassFF.Preferences.get('loginInputNames'))}.split(',');
    return nameOrIdMatches.some((regexStr) => {
             let regex = new RegExp(regexStr);
             return regex.test(element.name) || regex.test(element.id);
           });
  };

  let findAndFillOutInputs = function(doc, passwordData) {
    let filledOutElements = [];
    doc.querySelectorAll('input[type=text], input[type=email], input[type=password], input[type=tel]')
      .forEach((element) => {
        if (isPasswordInput(element)) {
          element.value = passwordData.password;
          filledOutElements.push(element);
        } else if (isUsernameInput(element)) {
          element.value = passwordData.username;
          filledOutElements.push(element);
        } // else if (isOtherInput(element, passwordData)) { ... }
      });
    return filledOutElements;
  };

  let attemptToEnterLogin = function(doc, passwordData, shouldSubmit, depth) {
    let filledInputs = findAndFillOutInputs(doc, passwordData);
    if (filledInputs.length > 0 && shouldSubmit) {
      let closest = function(element, query) {
        while (element) {
          if (element.matches(query)) {
            return element;
          } else {
            element = element.parentNode;
          }
        }
      };
      let firstForm = closest(filledInputs[0], 'form'),
          onlyFilledInOneForm = true;
      if (firstForm) {
        for (let i=1; i < filledInputs.length; i++) {
          let nextForm = closest(filledInputs[i], 'form');
          if (nextForm !== firstForm) {
            onlyFilledInOneForm = false;
            break;
          }
        }
        if (onlyFilledInOneForm) {
          return firstForm.submit();
        } else {
          console.debug("[PassFF] Auto-submit attempt failed either because more than one form was auto-filled");
        }
      } else {
        console.debug("[PassFF] Auto-submit attempt failed because a login field is not within a form element");
      }
    }
    if (depth < ${PassFF.Preferences.get('subpageSearchDepth')}) {
      doc.querySelectorAll('frame, iframe')
         .forEach((frame) => {
           attemptToEnterLogin(frame.contentDocument, passwordData, shouldSubmit, depth + 1);
         });
    }
  };

  attemptToEnterLogin(document, ${JSON.stringify(passwordData)}, ${shouldSubmit}, 0);
})();`;
    },
  };

  return {
    enterLogin: function(passwordData, shouldSubmit, tabId) {
      let codeStr = TemplateStrings.fillOutLoginForm(passwordData, shouldSubmit);
      return executeScript(tabId, codeStr);
    },
  };
})();
