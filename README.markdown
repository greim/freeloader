# FREELOADER

Declarative behavior binding for browsers, plus message-based communication for loose coupling goodness. AMD-compatible. Always live in the DOM. Friends with jQuery.

## Usage `freeloader.spec(className, specification)`

Bind a className to a specification. The specification controls the behavior of elements having that className.

    // Bind a behavior specification to DOM elements having class 'someclass'.
    freeloader.bind('someclass', {
        init:          <function> // (optional) Run when element first appears in the DOM and is bound.
        events:        <object>   // (optional) Events to delegate on this element.
        subscriptions: <object>   // (optional) Subscribe to messages that are sent to freeloader.
        myProperty1:   <anything>
        myProperty2:   <anything>
        ...
    });

Note: classNames are used specifically because of the fact that `getElementsByClassName()` returns a live list, giving us native list-management for free.

Events objects work like this:

    events: {
        'eventType selector': 'methodName' // delegate eventType on the instance element for selector
        'eventType': 'methodName'          // listen for eventType directly on instance element
    }                                      // in both cases, this.methodName() is called.

Subscriptions objects work like this:

    subscriptions: {
        'type': 'methodName' // call this.methodName() when somebody calls freeloader.send('type')
    }

Note that in all functions shown, `this` is a specification instance. Example: 

    foo: function(){ ... },
    init: function(){
        this.foo();
    },

## Usage `freeloader.send(messageType, ...)`

If you subscribed to global events from your `init()` method, for example, you'd be creating references back from an instance to the global object, preventing garbage collection in your app. Not only that, but unless you remember to write some event management biolerplate each time you do this, those events keep firing on your instance long after it has been removed from the DOM. It's a double-hit to performance.

    init: function(){
        $(window).on('resize', function(){ ...do stuff... });
        // now global scope has a reference to this object. No GC!
        // this event will fire forever, even after this element is gone
    }

Instead, freeloader provides a means of loosely-coupled, top-down messaging. 

    subscriptions: {
        'resize': 'adjustFit'
    },
    adjustFit: function(){ ...do stuff... }

...meanwhile...

    $(window).on('resize', function(){
        freeloader.send('resize');
    });
    // all interested parties will now be notified

