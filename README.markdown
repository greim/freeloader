# Freeloader

Freeloader is a small standalone JavaScript library intended for:

  1. Declarative DOM pre-processing
  2. Declarative library dependency loading

## Declarative DOM pre-processing

Some elements need to be wired up--or pre-processed--before they work.
Typically, we pre-process these elements during the page load event, but
increasing use of Ajax makes this approach unreliable and complicated.

Freeloader aims to free us from the tyranny of the page load event. Declare
which kinds of elements need pre-processing, then throughout the lifetime of the
page, freeloader will pounce on those elements as soon as they appear, and will
pre-process them.

    // widgetify all foos
    var widgetifyThis = function(){...};
    FREELOADER.id('foo').onload(widgetifyThis);

## Declarative library dependency loading

It's rarely the case that you need to load all your code, all the time.
Freeloader uses its built in pre-processing logic to offer a way to load only
what you need, based on which elements appear on the page.

    FREELOADER.lib('my-plugin.js').requires('jquery.js');
    FREELOADER.lib('footer-widget.js').requires('my-plugin.js');
    FREELOADER.id('footer').requires('footer-widget.js');

