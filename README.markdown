# freeloader is:

 * Experimental.
 * AMD-compatible.
 * Friends with jQuery.
 * Fast page reloads with ajax.
 * Not a client-side MVC framework.
 * Pseudo-declarative behavior binding for browsers.
 * Designed to look familiar to Backbone.js developers.
 * Loosely-coupled global events via a publish/subscribe model.

## Usage `freeloader.bind(selector, controller)`

Bind the given controller to all DOM nodes matching the given selector. `controller` becomes the prototype for a controller class, instances of which are bound to DOM nodes on the fly by freeloader. From a garbage-collection perspective, these instances are only reachable through the DOM, and thus are free to be garbage collected as sections of DOM are overwritten. The binding happens on DOM ready, and whenever you load new content into the page using `freeloader.navigate()` (see below), or whenever you tell freeloader to explicitly check for unbound nodes using the `freeloader()` jQuery plugin (see below).

    freeloader.bind('.foo #bar', {
      initialize:    <function> // (optional) Run when element first appears in the DOM.
      events:        <object>   // (optional) Delegate events on the element.
      subscriptions: <object>   // (optional) Subscribe to messages, AKA global events.
      myProperty1:   <anything>
      myProperty2:   <anything>
      ...
    });

The similarities between freeloader controllers and backbone views are intentional. Freeloader was built to provide an easy migration strategy away from backbone. Backbone views are partly controllers, and partly views, whereas freeloader controllers arern't views (no template rendering) and add another aspect of control via subscriptions.

    freeloader.bind('.foo #bar', {
      initialize: function(){ ... }
      userMethod: function(){ ... }
      events: { ... }
      subscriptions: { ... } // <-- not part of backbone
    });

    var MyView = Backbone.View.extend({
      initialize: function(){ ... }
      userMethod: function(){ ... }
      events: { ... }
      render: function(){ ... } // <-- not part of freeloader
    });

The `initialize` method works like this:

    freeloader.bind('.foo #bar', {
      ...
      initialize: function() {
        // `this` is a controller instance
        // `this.el` is the instance element
        // `this.$el` is a jQuery object wrapping the instance element
        // `this.$` is shorthand for `this.$el.find`
        $.contains(document.documentElement, this.el) === true
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

## Usage `freeloader.publish(messageType)`

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
      freeloader.publish('resize');
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

### Examples of global events that controllers might be interested in:

 * Window resize
 * Orientation change on mobile devices
 * Cross-window communications
 * Incoming communications over websockets
 * Local storage updates
 * History API pops and pushes
 * Page visibility change
 * Off-element clicks to close a dialog

## Usage `freeloader.navigate(url, options)`

Navigate to a new page without refreshing the page using ajax and history API. Freeloader checks the new content for unbound nodes and binds them. The options object looks like this:

    freeloader.navigate('page.html', {
        from: string                // selects which part of new page to extract and insert into existing page. default: 'body'
        to: string                  // selects which part of existing page to receive new content. default: 'body'
        mode: string                // determines how to update the page
                                    //     "replace"         - $(from) replaces $(to).
                                    //     "replaceChildren" - $(from)'s children replace $(to)'s children.
                                    //     "inject"          - $(from) replaces $(to)'s children.
                                    //     "append"          - $(from) is inserted after $(to)'s children.'
                                    //     "prepend"         - $(from) is inserted before $(to)'s children.
                                    // default: 'replace'
        scrollToTop: boolean        // whether to scroll to top. default: true
        updateTitle: boolean        // whether to update document.title. default: true
        pushState: boolean          // update url using history API. default: true
        pushStateFallback: function // what to do in old browsers. default: refresh browser to new page
        onload: function            // optional callback once fetch succeeds and page is updated. optional
        onerror: function           // what to do if page fetch fails. optional
    });

## Usage `$(anything).freeloader()`

This is a helper jQuery plugin to explicitly tell freeloader to check a given section of the DOM for unbound elements. You don't need to do this when you do `freeloader.navigate()`, however if you load new content into the page by some other means, you'll need to do this. This method is [idempotent](http://en.wikipedia.org/wiki/Idempotence), so calling it multiple times has no adverse affect other than using up a few extra CPU cycles.

