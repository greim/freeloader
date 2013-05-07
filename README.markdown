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
      ...
      initialize: function() {
        this.$el.is('.foo #bar') === true
        $.contains(document.documentElement, this.el) === true
        // `this` is a controller instance
        // `this.el` is the instance element
        // `this.$el` is a jQuery object wrapping the instance element
        // `this.$` is shorthand for `this.$el.find`
      }
      ...
    });

The events object works like this:

    freeloader.bind('.foo #bar', {
      ...
      events: {
        'event selector': 'method' // delegate event on the element for selector
        'event': 'method'          // listen for event directly on element (no delegation)
      }                            // 'method' is called by name on the controller instance
      ...
    });

Subscriptions objects work like this:

    freeloader.bind('.foo #bar', {
      ...
      subscriptions: {
        'type': 'method' // call method when there's a message of type type
      }
      ...
    });

## Usage `freeloader.publish(messageType)`

freeloader provides a means of loosely-coupled, top-down messaging, allowing global events to broadcast commands to controller instances that are live in the document.

    freeloader.bind('.foo #bar', {
      ...
      subscriptions: {
        resize: 'adjustFit'
      },
      adjustFit: function(){
        ...
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

...which would add a new event handler to the window object for each bound element. If these handlers weren't removed manually, they'd accumulate and tie up system resources, causing memory leaks and unnecessary CPU load long after they disappeared from the live DOM. Freeloader's messaging system avoids this issue using a form of lazy event binding.

Examples of global events that individual controllers might be interested in subscribing to:

 * Window resize
 * Orientation change on mobile devices
 * Cross-window communications
 * Incoming communications over websockets
 * Local storage updates
 * History API pops and pushes
 * Page visibility change
 * Off-element clicks to close a dialog

## Usage `freeloader.navigate(url, options)`

Navigate to a new page, without refreshing the page, using ajax and the history API. Freeloader automatically checks the new content for unbound nodes and binds them. The options object looks like this:

    freeloader.navigate('/my/page', {
        from: string         // selects which part of new page to extract and insert into existing page. default: 'body'
        to: string           // selects which part of existing page to receive new content. default: 'body'
        mode: string         // determines how to update the page
                             //     "replace"         - $(from) replaces $(to). (default)
                             //     "replaceChildren" - $(from)'s children replace $(to)'s children.
                             //     "inject"          - $(from) replaces $(to)'s children.
                             //     "append"          - $(from) is inserted after $(to)'s children.'
                             //     "prepend"         - $(from) is inserted before $(to)'s children.
        scrollToTop: boolean // whether to scroll to top. default: true
        updateTitle: boolean // whether to update document.title. default: true
        pushState: boolean   // whether to update url using history API. default: true
        pushStateFallback: function // what to do in old browsers. default: refresh browser to new page
        onload: function     // what to do when fetch succeeds and page is updated. default: nothing
        onerror: function    // what to do if page fetch fails. default: navigate to url
    });

## Usage `$(anything).freeloader()`

This is a helper jQuery plugin to explicitly tell freeloader to check a given section of the DOM for unbound elements. You don't need to do this when you do `freeloader.navigate()`, however if you load new content into the page by some other means, you'll need to do this. This method is [idempotent](http://en.wikipedia.org/wiki/Idempotence), so calling it multiple times has no adverse affect other than using up a few extra CPU cycles. Warning: only call this on live DOM nodes, otherwise it will puke.

# Freeloader Philosophy

If freeloader seems more simplistic than an MVC framework like Backbone, that's because it is. However, freeloader isn't necessarily for simpler apps. Rather, it's the client-side piece of an app where data models and template rendering happen mainly on the server. 

Why? The SPI paradigm has issues which vary in significance depending on what you're trying to do. It comes down to three main things. 1) Content is invisible to search engines. 2) All-client-side means more code and a larger performance burden on the client device. Of course there are optimizations and tricks to get around these two issues. But the fact that you have to use "optimizations" and "tricks" may be the universe's way of telling you that 3) The SPI paradigm goes against the grain of how the web works. The web has always been documents accessable via URLs over HTTP. This is really the most concise summary of the problem with SPIs.

This isn't to say that SPIs are never the right solution. Rather, like any tool they're better suited to some tasks than others. Freeloader offers an alternative to SPIs for building content-driven, URL-accessable websites. For complex UIs where you're less likely to need to bookmark or search specific states, then SPIs remain a compelling choice.







