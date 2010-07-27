# Freeloader

Freeloader is a small standalone library intended for:

  1. Declarative DOM pre-processing
  2. Declarative library dependency loading

## Declarative DOM pre-processing

Some elements need to be "wired up" before they work. You can pre-process these elements during the page load event, but increasing use of Ajax makes this approach unreliable and complicated.

Freeloader offers an alternative. Declare which elements need pre-processing, then let each such element be pre-processed when it first appears on the page, throughout the lifetime of the page.

    // widgetify all foos
    var widgetifyThis = function(){...};
    FREELOADER.id('foo').onload(widgetifyThis);

## Declarative library dependency loading

It's rarely the case that you need to load all your code, all the time. Freeloader uses its built in pre-processing capability to offer a way to load only what you need, based on the elements that are currently on the page.

    FREELOADER.lib('my-plugin.js').requires('jquery.js');
    FREELOADER.lib('footer-widget.js').requires('my-plugin.js');
    FREELOADER.id('footer').requires('footer-widget.js');

