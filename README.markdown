# FREELOADER

Declarative behavior binding for browser DOM, plus message-based communication for loose coupling goodness. AMD-compatible. Declare your specs, then inject HTML all over the place. Or just let it operate on what got served. Requires jQuery.

## Usage `freeloader.spec()`

    freeloader.spec({
        classNameKey:  <string>   // Specify behavior on dom elements having this class name.
        validate:      <function> // (optional) Return a string if DOM subtree invalid, else false.
        init:          <function> // (optional) Run when element first appears in the DOM.
        events:        <object>   // Events to delegate on this element.
        subscriptions: <object>   // Subscribe to certain global events.
        methods:       <object>   // Functions referenced above.
    });

Note the name `classNameKey`. A className is required specifically because of the fact that `getElementsByClassName()` returns a live list, giving us native list-management for free. Thus, freeloader specs are keyed by `className`, as opposed to arbitrary selectors or values stored in data attributes for example. Queries for those things, for example lists returned by `jQuery()` or `querySelectorAll()`, aren't live lists. 

Events objects work like this:

    events: {
        'eventType selector': 'methodName' // delegate eventType on the instance element for selector
        'eventType': 'methodName'          // listen for eventType directly on instance element
    }                                      // in both cases, methods.methodName() is called

Subscriptions objects work like this:

    subscriptions: {
        'type': 'methodName' // call methods.methodName(args) when somebody calls freeloader.message('type', args)
    }

Note that in all functions shown, `this` is the instance element, not wrapped in jQuery. Also, the instance element has a run() method that accepts a string and executes one of the given methods. Example: 

    init: function(){
        this.run('adjustFit');
    }

## Usage `freeloader.message()`

    freeloader.message(type, args)

Args is optional, and can be anything, but is intended to be a named-parameter argument. Calling this method notifies any instance elements that are subscribed to messages of type `type`.