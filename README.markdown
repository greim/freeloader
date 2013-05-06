# freeloader is:

 * Experimental.
 * Pseudo-declarative behavior binding for browsers.
 * Message-based communication for loose coupling goodness.
 * AMD-compatible.
 * Friends with jQuery.

## Usage `freeloader.bind(selector, controllerSpec)`

Create a controller for all DOM nodes matching the given selector. `controllerSpec` becomes the prototype for controller instances that are bound to DOM nodes by freeloader. These instances are only reachable through the DOM, and thus are free to be garbage collected as soon as the DOM nodes they're bound to go away. The binding happens on DOM ready, and whenever you load new content into the page using freeloader.

    freeloader.bind('.foo #bar', {
      init:          <function> // (optional) Run when element first appears in the DOM.
      events:        <object>   // (optional) Delegate events on the element.
      subscriptions: <object>   // (optional) Subscribe to messages, AKA global events.
      myProperty1:   <anything>
      myProperty2:   <anything>
      ...
    });

The `init` method works like this:

    freeloader.bind('.foo #bar', {
      ...
      init: function() {
        // `this` is the controller instance
        // `this.el` is an element that's live in the document
        // `this.$el` is a jQuery object, wrapping the DOM element
        // `this.$` is shorthand for `this.$el.find`
        // $.contains(document.documentElement, this.el) === true
      }
      ...
    });

The events object works like this:

    freeloader.bind('.foo #bar', {
      ...
      events: {
        '<event> <selector>': '<method>' // delegate <event> on the element for <selector>
        '<event>': '<method>'            // listen for <event> directly on element
      }                                  // '<method>' is called by name on the controller instance
      ...
    });

Subscriptions objects work like this:

    freeloader.bind('.foo #bar', {
      ...
      subscriptions: {
        '<type>': '<method>' // call <method> when there's a message of type <type>
      }
      ...
    });

## Usage `freeloader.send('<type>')`

freeloader provides a means of loosely-coupled, top-down messaging, allowing global events to broadcast commands to controller instances that are live in the document.

    freeloader.bind('.foo #bar', {
      ...
      subscriptions: {
        'resize': 'adjustFit'
      }
      ...
    });

    // meanwhile

    $(window).on('resize', function(){
      freeloader.send('resize');
    });

Which is better than doing the following:

    freeloader.bind('.foo #bar', {
      ...
      init: function(){
        var self = this;
        $(window).on('resize', function(){
          self.adjustFit();
        });
      }
      ...
    });

Using this latter approach would add a new event handler to the window object for each bound element. If these handlers weren't removed manually, then they'd accumulate and tie up system resources, causing memory leaks and unnecessary CPU load, long after they had disappeared from the user's view. Freeloader's messaging system avoids this issue.

### Examples of messagable events

 * Window resize events
 * Orientation change events on mobile devices
 * Cross-window communication events
 * Incoming events from websockets
 * Local storage events
 * History API events
 * Page visibility change events
 * Any DOM event handled on `document.documentElement`

## Usage `freeloader.navigate(url, options)`

Navigate to a new page without refreshing the page. Uses history API and ajax fetch. The options object looks like this:

    freeloader.navigate('page.html', {
        from: string                // DOM selector for which part of new page to insert default: 'body'
        to: string                  // DOM selector for which part of existing page to update default: 'body'
        mode: string                // determines how to update the page
                                    //     "replace"         - from replaces to[0].
                                    //     "replaceChildren" - from[0]'s children replace to[0]'s children.
                                    //     "inject"          - from replaces to[0]'s children.
                                    //     "append"          - from is inserted after to[0]'s children.'
                                    //     "prepend"         - from is inserted before to[0]'s children.
                                    // default: 'replace'
        scrollToTop: boolean        // whether to scroll to top. default: true
        updateTitle: boolean        // whether to update document.title. default: true
        pushState: boolean          // update url using history API. default: true
        pushStateFallback: function // what to do in old browsers. default: refresh browser to new page
        onload: function            // optional callback once fetch succeeds and page is updated. optional
        onerror: function           // what to do if page fetch fails. optional
    });




