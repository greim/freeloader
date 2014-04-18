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

Bind the given controller to all DOM nodes matching the given selector. `controller` becomes the prototype for a controller class, instances of which are bound to DOM nodes on the fly by freeloader. From a garbage-collection perspective, these instances are only reachable through the DOM, and thus are free to be garbage collected as sections of DOM are overwritten. The binding happens on DOM ready, and whenever you load new content into the page using `freeloader.navigate()` (see below), or whenever you tell freeloader to explicitly check for unbound nodes using the `freeloader()` jQuery plugin included as part of this library (see below).

    freeloader.bind('.foo #bar', {
      initialize:    function // (optional) Run when element first appears in the DOM.
      events:        object   // (optional) Delegate events on the element.
      subscriptions: object   // (optional) Subscribe to global events.
      myProperty1:   anything
      myProperty2:   anything
      ...
    });

The similarities between freeloader controllers and Backbone views are intentional. Freeloader was built to provide an easy migration strategy away from Backbone. Backbone views are partly controllers, and partly views, whereas freeloader controllers arern't views (no template rendering) and add another aspect of control via subscriptions.

    freeloader.bind('.foo #bar', {
      initialize: function(){ ... }
      events: { ... }
      subscriptions: { ... } // <-- not part of Backbone
    });

    var MyView = Backbone.View.extend({
      initialize: function(){ ... }
      events: { ... }
      render: function(){ ... } // <-- not part of freeloader
    });

The `initialize` method works like this:

    freeloader.bind('.foo #bar', {
      initialize: function() {
        this.$el.is('.foo #bar') === true
        $.contains(document.documentElement, this.el) === true
        // `this` is a controller instance
        // `this.el` is the bound element
        // `this.$el` is a jQuery object wrapping the bound element
        // `this.$` is an alias to `this.$el.find`
      }
      ...
    });

The events object works like this:

    freeloader.bind('.foo #bar', {
      events: {
        'event selector': 'method' // delegate event on the element for selector
        'event': 'method'          // listen for event directly on element (no delegation)
      }                            // 'method' is called by name on the controller instance
      ...
    });

Subscriptions objects work like this:

    freeloader.bind('.foo #bar', {
      subscriptions: {
        'type': 'method' // call method when there's a message of type type
      }
      ...
    });

## Usage `freeloader.publish(messageType)`

freeloader provides a means of loosely-coupled, top-down messaging, allowing global events to broadcast commands to controller instances that are live in the document.

    freeloader.bind('.foo #bar', {
      subscriptions: {
        resize: 'adjustFit'
      },
      adjustFit: function(){ ... }
      ...
    });

    // meanwhile

    $(window).on('resize', function(){
      freeloader.publish('resize');
    });

Which is better than doing the following:

    // bad!
    freeloader.bind('.foo #bar', {
      init: function(){
        var self = this;
        $(window).on('resize', function(){
          self.adjustFit();
        });
      }
      ...
    });

...which would add a new event handler to the window object for each bound element. If these handlers weren't removed manually, they'd accumulate and tie up system resources, causing memory leaks and unnecessary CPU load long after they disappeared from the live DOM. Freeloader's messaging system avoids this issue using a form of lazy event binding.

Examples of global events that individual controllers might be interested in subscribing to:

 * Window resize
 * Orientation change on mobile devices
 * Cross-window communications
 * Incoming communications over websockets
 * Local storage updates
 * History API pops and pushes
 * Page visibility change
 * Window focus/blur
 * Window scroll
 * Off-element clicks to close a dialog

## Usage `freeloader.load(url, options)`

Load a page using ajax and process the result as a new Document object, not attached to the DOM.

    freeloader.load('/my/page.html', {
        data: object         // if present, used to build a query string (optional)
        success: function    // what to do in case of success
        error: function      // what to do in case of error
        context: anything    // this in success and error functions (optional)
    });

To implement an in-page append, do:

    freeloader.load('/photos?page=2', {
      success: function(doc){
        var appendMe = $(doc).find('#content').children().remove();
        $('#content').append(appendMe);
      }
    });

## Usage `$(anything).freeloader()`

This is a helper jQuery plugin to explicitly tell freeloader to check a given section of the DOM for unbound elements. If you load new content into the page, for example using client-side templates, you'll need to do this. This method is [idempotent](http://en.wikipedia.org/wiki/Idempotence), so calling it multiple times has no adverse affect other than using up a few extra CPU cycles. Warning: only call this on live DOM nodes, otherwise it will puke.



