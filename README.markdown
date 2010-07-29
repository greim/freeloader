# Freeloader

Freeloader is a *listener engine* that responds to changes in the DOM over the
lifetime of the page. Freeloader neither knows nor cares about the onload and
DOMContentLoaded events. You simply tell freeloader what elements to listen for,
and what to do once it finds them, and it just works. Freeloader can do three
things:

 1. Build a dependency graph of libraries, so that it knows which libraries to load, in what order.
 2. Load a set of required libraries the first time an element with a given class or id appears on the page.
 3. Pre-process every element with a given class or id that appears on the page.

## Pre-processing

Freeloader moves the behavior layer closer to a declarative programming model.
In CSS, you can declare your widget to have 11px font, and the browser's CSS
engine takes care of the rest:

    #my-widget { font-size: 11px; }

In the behavior layer, unfortunately there's no corresponding way to say:

    #my-widget { onload: function(){...}; }

But freeloader lets you at least *simulate* the idiom:

    FREELOADER.id('my-widget').onload(function(){...});

Subsequently, that function will be called against all instances of elements
with an id of "my-widget" when they first appear, *regardless of whether the
page load event has fired*.

## Library loading

To minimize the amount of code you load onto any given page, freeloader lets you
build a dependency graph of libraries, and then declare which elements require
those libraries. Freeloader will then load only the required libraries onto the
page, and only when such an element first appears on the page.

    FREELOADER.lib('my-plugin.js').requires('jquery.js');
    FREELOADER.lib('footer-widget.js').requires(['my-plugin.js','footer-widget.css']);
    FREELOADER.id('footer').requires('footer-widget.js');

    ...elsewhere...

    document.body.innerHTML += '<div id="footer">...</div>';
    // required libraries will now begin loading, serially and in proper order

## You Might Like Freeloader If...

 * you don't want to load any more library code than you have to.
 * you have lots of libraries with lots of interdependencies.
 * you need your widgets to work before the page load event fires, without littering the page with script tags.
 * you need your widgets to work after the page load event fires, even if they get added to the DOM at random times.
 * you'd really rather just forget about the page load event altogether.
 * you need top-notch performance in modern browsers, and at least for it to work in older browsers.
 * you like the idea of lightweight JavaScript libraries that focus on doing a few things well.

