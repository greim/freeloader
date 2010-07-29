# Freeloader - Introduction to the API

Freeloader provides these methods, which are described in further detail below.

    FREELOADER.lib(thisUrl).requires(thatUrl);
    FREELOADER.lib(url).load(callback);
    FREELOADER.patterns.js(exp);
    FREELOADER.patterns.css(exp);
    FREELOADER.id(str).onload(process);
    FREELOADER.className(str).onload(process);
    FREELOADER.id(str).requires(url);
    FREELOADER.className(str).requires(url);

## Building a Library Dependency Graph

    FREELOADER.lib(thisUrl).requires(thatUrl);

Builds a dependency graph of libraries, which are used later on. Doesn't
actually load any libraries at the time it's called.

<code>thisUrl</code> must be a string. <code>thatUrl</code> must be either a
string or an array of strings. URLs should point to either CSS or JS files.

## Explicitly Loading a Library

    FREELOADER.lib(url).load(callback);

Loads the library at <code>url</code> onto the page. Any pre-requisite libraries
(i.e. contained in dependency graph) are loaded onto the page first.

All CSS files are loaded immediately and concurrently. JS files are loaded
serially to avoid dependency errors. 404 errors won't cause freeloader to stop
loading remaining files. Libraries are only loaded once, even if they occur
multiple times in the dependency graph.

<code>callback</code> is optional and doesn't accept parameters, and is executed
after last JS library has loaded and executed.

## Teaching Freeloader new CSS and JS URL Patterns

    FREELOADER.patterns.js(exp);
    FREELOADER.patterns.css(exp);

Teaches freeloader to recognize URLs as either CSS or JS. <code>exp</code> must
be either a regexp or an array of regexps. Out of the box, freeloader will treat
<code>.css</code> and <code>.js</code> extensions as CSS and JS, respectively.
Freeloader ignores URLs it doesn't recognize.

## Declarative DOM Pre-processing

    FREELOADER.id(str).onload(process);
    FREELOADER.className(str).onload(process);

Pre-processes each new occurrance of an id or class in the DOM, throughout the
lifetime of the page. When <code>process</code> executes, the <code>this</code>
object refers to the element.

## Declarative Library Loading

    FREELOADER.id(str).requires(url);
    FREELOADER.className(str).requires(url);

Loads the given library the first time an id or class occurrs in the DOM,
throughout the lifetime of the page. Loading follows same rules as load method
described above. <code>url</code> must be either a string or an array of
strings.
