# Freeloader - Introduction

Freeloader is a small standalone library intended for:

 1. Declarative DOM pre-processing
 2. Declarative library dependency loading

## Declarative DOM Pre-processing

    // widgetify all foos
    var widgetifyThis = function(){...};
    FREELOADER.id('foo').onload(widgetifyThis);

Whenever an element with an id of "foo" appears on the page, freeloader calls
the given function against that element. An element is only pre-processed once.
Combined with event delegation, a more straightforward web development model is
now possible.

    // declare dom pre-processing
    FREELOADER.id('foo').onload(buildFooWidget);
    FREELOADER.id('bar').onload(buildBarWidget);
    FREELOADER.className('baz').onload(buildBazWidget);

    // declare event handlers
    jQuery('#foo').live('click', function(){...});
    jQuery('#bar').live('mouseover', function(){...});
    jQuery('.baz').live('click', function(){...});

Contrast this with the standard approach, where elements are pre-processed
during the page load event. With ajax becoming more widespread and widgets
being loaded into the page at various times, this do-it-once model needs to be
replaced by a more continuous, declarative model.

## Declarative Library Dependency Loading

It's rarely the case that you need to load all your code, all the time.
Freeloader therefore provides an API that allows you to load only what you
need, based on the elements that are currently on the page. This is done in two
steps. First, you build a dependency graph of JavaScript and CSS libraries, by
URL. Once this is done, you tell it which elements require which libraries. The
first time an instance of that element appears in the dom, the needed libraries
are serially loaded, one after the other, in proper order. Duplicates and
circularities in the dependency graph are handled gracefully.

    // build library dependency graph
    FREELOADER.lib('my-jquery-plugin.js').requires('jquery.js');
    FREELOADER.lib('my-other-jquery-plugin.js').requires('jquery.js');
    FREELOADER.lib('footer-widget.js').requires('my-other-jquery-plugin.js');
    FREELOADER.lib('menu-widget.js').requires([
        'my-jquery-plugin.js',
        'my-other-jquery-plugin.js',
        'menu-widget.css'
    ]);

    // declare DOM dependencies
    FREELOADER.id('menu').requires('menu-widget.js');
    FREELOADER.id('footer').requires('footer-widget.js');

Freeloader treats all .js extensions as JavaScript libraries, and all .css
extensions as CSS libraries. If your JS or CSS files have other extensions, you
can teach freeloader to recognize them using regular expressions.

    FREELOADER.patterns.css(/.*\.scss$/); // SASS!
    FREELOADER.patterns.js(/\/js\/bundler.*\.jsp/); // dynamic bundler!

## Full API

    FREELOADER.lib(url)
        .requires(url); // url can be array
        .load(callback); // callback optional

    FREELOADER.patterns
        .js(exp); // exp can be array
        .css(exp); // exp can be array

    FREELOADER.id(str)
        .requires(url, callback); // url can be array, callback optional
        .onload(process); // 'this' references element

    FREELOADER.className(str)
        .requires(url, callback); // url can be array, callback optional
        .onload(process); // 'this' references element
