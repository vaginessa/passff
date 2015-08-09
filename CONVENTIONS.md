# PassFF Javascript Conventions

Please follow these conventions and amend to them when necessary.

## Indentation

Two spaces.

## Line length

At most 90 characters.

## Semicolons

Always terminate statements with semicolons.

## Inline functions

Should have line breaks after the opening and before the closing brace.

```
// good
toggleKey.addEventListener('command', function(event) {
  event.target.ownerDocument.getElementById(PassFF.Ids.button).click();
}, true);

// bad
toggleKey.addEventListener('command', function(event) {event.target.ownerDocument.getElementById(PassFF.Ids.button).click();}, true);
```

## Anonymous functions

Always put a space between the function keyword and the opening paranthesis.

## Braces

On the same line as the statement.

```
// good
if (true) {
  // your code here
}

// bad
if (true)
{
  // your code here
}
```

## Line breaking

PEP8-Style. When breaking statements into multiple lines:

* Place function arguments one character to the right of the opening paranthesis.
```
PassFF.Menu.createContextualMenu(aBrowser.ownerDocument,
                                 aBrowser.ownerGlobal.content.location.href);
```

* Break chained function calls before the connecting dot, and align the dot
  with the last dot on the previous line.
```
let domWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                          .getInterface(Ci.nsIDOMWindow);
```

