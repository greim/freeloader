# Freeloader

Freeloader is a JavaScript framework that allows application routing and templating to return to the server from whence they came, while retaining the benefits of the single-page app paradigm (where routing and templating happen on the client).

Freeloader is thus not itself an MVC framework, but rather the client-side part of the *C* in an MVC system that spans both client and server.

Namely, Freeloader is a way to control the behavior of DOM elements.
This is achieved using a declarative scheme, where a control specification is bound to a DOM selector.
Freeloader then instantiates controllers behind the scenes whenever needed.

# Code sample

```javascript
freeloader.bind('div.my-element', {
  events: {
    // DOM event router
    // Handle click and other events here
  },
  subs: {
    // Subscriptions router
    // Communicate with other controllers
  },
  init: function() {
    // Runs once for each new div.my-element
    // 'this' is the controller instance
    // 'this.el' is the element being controlled
  },
  myMethod: function() {
    // You can add arbitrary methods
  }
});
```