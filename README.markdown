# Freeloader

Freeloader is a lightweight *listener engine* that responds to changes in the
DOM over the lifetime of the page. You simply tell freeloader what elements to
listen for, and what to do once it finds them, and it just works. Freeloader
does two things:

 2. Loads a set of required libraries the first time an element with a given class or id appears on the page.
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

This addresses a common problem in JavaScript development. Suppose you have a
widget that gets served as part of the page source, that needs to be "wired up"
in order to function. The wiring happens at page load time, like this:

    function setupMyWidget(){...}
    jQuery(document).ready(function(){
        jQuery('#my-widget').each(setupMyWidget);
    });

But say you want to drop new content onto the page using ajax, which may or may
not contain instances of this widget. Now in your script logic you need to worry
about if/when the widget will appear after the page load event fires. Freeloader
lets you forget about the page load event altogether and simply pre-process
elements as they get introduced to the DOM. This is a declarative programming
idiom in the sense that you declare your intentions, and freeloader takes care
of the rest.

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
