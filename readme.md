# Freeloader.js

Freeloader.js is a declarative behavior system for server-rendered webapps.
It consists of two main pieces:

 1. A way to declare which controller definitions get bound to which elements.
 2. Tools for loading new content into the DOM.

## Installation

Install via npm:

```
$ npm install freeloader-js --save
```

## Creating an app

A freeloader app looks like this:

```javascript
var freeloader = require('freeloader-js')
var app = freeloader()
```

## Controllers

Once you have your app, you can declaratively add behaviors, in the form of controllers.

```javascript
app.bind('#banner', { ... });
app.bind('#menu', { ... });
app.bind('#login-form', { ... });
```

### Events

Controllers (the `{...}` bits in the above code) are simply event routers for DOM elements.
"Events" brings to mind DOM events, but those are just one kind of event a freeloader controller can respond to.
Event types include:

 * Controller lifecycle events (`life`)
 * Messages from ancestor controllers (`above`)
 * Messages from descendant controllers (`below`)
 * Subscriptions to globally-published events (`subs`)
 * DOM events (`events`)

*Ancestor* and *descendant* controllers just means controller instances attached to elements higher or lower in DOM tree.
Other than a controller instance being bound to a single element, there are no rules or limits about what the hierarchy can look like.
You can bind one controller to many elements, or multiple controllers to a single element.
Here's a kitchen-sink example of a controller.

```javascript
app.bind('#my .selector', {

  life: { ...lifecycle events... },
  handler: function(){ ... },
  handler: function(){ ... },

  events: { ...DOM events... },
  handler: function(){ ... },
  handler: function(){ ... },

  above: { ...ancestor messages... },
  handler: function(){ ... },
  handler: function(){ ... },

  below: { ...descendant messages... },
  handler: function(){ ... },
  handler: function(){ ... },

  subs: { ...subscriptions... },
  handler: function(){ ... },
  handler: function(){ ... }
});
```

Each kind of event has its own way of being triggered.

 * `life` - Lifecycle events are triggered internally by freeloader.
 * `events` - DOM events are triggered by the user.
 * `above` - Ancestor messages are sent by ancestor controllers, using `this.down()`
 * `below` - Descendant messages are sent by descendant controllers, using `this.up()`
 * `subs` - Subscription events are sent by any controller, using `this.publish()`. Alternatively, they can be sent from non-controller contexts as long as you have a reference to the app, using `app.publish()`.

### Reference-keeping

All reference-keeping work is offloaded to the browser via the DOM, so you don't need to worry about the memory leaks or zombie handlers that normally arise when tying lots of things together using event handlers.
In other words, no controller will ever receive an event that isn't alive and awake in the document.
Here's an example of a controller that keeps its element's aspect ratio constant, both when it's first created and when the window changes size:

### Example

```javascript
app.bind('#my .selector', {

  life: {
    mount: 'setSize'
  },
  
  subs: {
    orientationchange: 'setSize',
    resize: 'setSize'
  },
  
  setSize: function(){
    this.width = this.$el.width();
    this.$el.css('height',(width/2)+'px');
  }
});

$(window).on('resize', function(){
  app.publish('resize');
});

$(window).on('orientationchange', function(){
  app.publish('orientationchange');
});
```

## Content loading

Freeloader provides two primary ways to add new content to the DOM.

 1. **Navigation** - Loading a whole new page via `app.navigate()`.
 2. **Injection** - Loading fragments of pages via `this.inject()` from within a controller.

### Navigation

```javascript
app.navigate('/foo?bar=baz', function(err){
  if (err) { ...the connection died... }
  else { ...the request was 200, 404, 500, etc... }
});
```

Whether your browser supports the history API or not, a call to `app.navigate('/foo?bar')` results in the URL bar being updated to `/foo?bar`.
To be clear, in otherwords, at no point will `/#foo?bar` or `/?bar#foo` ever appear in the URL.
In the former case, the contents of `/foo?bar` are fetched via XHR and injected into the page, css/js fetched, and the URL updated using the history API.
In the latter case, the browser simply navigates to the new page: `location.href = '/foo?bar'`.
The end result is the same, except that modern browsers will be lots faster.

A page's scripts should therefore in no way depend on events such as `onload` or `domready`, or otherwise make synchronous assumptions with respect to initial page-load orchestration.
This is one of the few things freeloader is opinionated about.
Fortunately freeloader's declarative paradigm encourages no such assumptions to begin with, so things should be copacetic.

Besides the speed boost in modern browsers, freeloader's navigation automatically rebinds declared behaviors.
This includes existing ones and any ones declared in newly-loaded scripts.
This allows you to break apart your scripts on a per-page basis, thus minimizing initial download time.

### Injection

```javascript
this.inject(options, callback);
```

From within a controller, you may `inject()` content.
The inection API is extremely flexible.
The `options` argument is an argument with a source directive and a target directive.
The source is either a string of HTML code, or a URL to retrieve HTML from.
The target dictates where to put that HTML.
Suppose you have a URL called `/posts` that returns a DOM tree like this:

```
/posts?page=1
ul.posts
|--li.post#post1
|--li.post#post2
`--li.post#post3

/posts?page=2
ul.posts
|--li.post#post4
|--li.post#post5
`--li.post#post6
```

Then suppose you have a controller, with a "load more" button at the bottom.
Your controller's element has a DOM tree like this:

```
div
|--ul.posts
|  |--li.post#post1
|  |--li.post#post2
|  `--li.post#post3
`--button.load-more
```

You can inect like this:

```javascript
this.inject({
  url: '/posts?page=2 li.post',
  append: 'ul.posts'
}, function(err){
  if (err) { ...content was not injected... }
  else { ...content was injected... }
});
```

Source directives can be one of these forms:

 * `url: 'url'` (contents of the URL)
 * `url: 'url selector'` (a selection from within the URL)
 * `html: 'string'` (arbitrary chunk of HTML code)
 * `html: 'element'` (one or more DOM or jQuery objects)

Target directives can be one of these forms:

 * `replace: true` (replace this element)
 * `replace: 'selector'` (replace a sub-element)
 * `before: true` (insert before this element)
 * `before: 'selector'` (insert before a sub-element)
 * `after: true` (insert after this element)
 * `after: 'selector'` (insert after a sub-element)
 * `prepend: true` (prepend to this element)
 * `prepend: 'selector'` (prepend to a sub-element)
 * `append: true` (append to this element)
 * `append: 'selector'` (append to a sub-element)











