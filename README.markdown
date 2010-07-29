# Freeloader

Freeloader is a small, standalone JavaScript library intended for:

  1. Declarative DOM pre-processing
  2. Declarative library dependency loading

## Declarative DOM pre-processing

Some elements need to be wired up—or pre-processed—before they work.
Typically, we pre-process these elements during the page load event, but
increasing use of Ajax makes this approach unreliable and complicated.

Freeloader aims to free us from the tyranny of the page load event and move to a
more declarative style. It lets you declare which kinds of elements need
pre-processing, then throughout the lifetime of the page, it will detect
those elements when they appear and process them.

    // widgetify all foos
    var widgetifyThis = function(){...};
    FREELOADER.id('foo').onload(widgetifyThis);

## Declarative library dependency loading

It's rarely the case that you need to load all your code, all the time.
Freeloader uses its built in pre-processing logic to offer a way to conditionally
load libraries, in order of dependency, based on which elements appear on the 
page, at any point during the lifetime of the page.

    FREELOADER.lib('my-plugin.js').requires('jquery.js');
    FREELOADER.lib('footer-widget.js').requires('my-plugin.js');
    FREELOADER.id('footer').requires('footer-widget.js');

## Why Freeloader?

Freeloader is ideal when:

 * you don't want to load any more library code than you have to.
 * you have lots of libraries with lots of interdependencies.
 * you need your widgets to just work, whether you add them to the DOM before or after the page load event fires.
 * you need top-notch performance in modern browsers.
 * you need it to work in older versions of IE, but performance isn't top priority.
 * you like the idea of a small, lightweight JavaScript library that focuses on doing a small set of things well.

