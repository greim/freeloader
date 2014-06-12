var _ = require('lodash');
var $ = require('jquery');
var _slice = [].slice;
var await = require('await');

// bind a function to a context, but,
// returned function must be called
// twice to execute the function.
function doubleBack(cb, ctx){
  if (!cb) return function(){};
  var db = function(){
    if (db.called) cb.call(ctx);
    else db.called = true;
  };
  return db;
}

/**
 * Control a DOM subtree with various event routers:
 *
 * - subs:
 * --- handles: app-wide pub/sub events
 * --- trigger: this.publish() in other controllers
 * - below:
 * --- handles: incoming messages from descendant nodes
 * --- trigger: this.up() in other controllers
 * - above:
 * --- handles: incoming messages from ancestor nodes
 * --- trigger: this.down() in other controllers
 * - events:
 * --- handles: DOM events (using event delegation on this.el)
 * --- trigger: user clicks, etc
 *
 * Controllers aren't instantiated manually. Instead, they're
 * created automatically at DOM ready and as this.html() is
 * called from within controllers.
 */
function Controller(el, app){
  this.app = app;
  this.init();
  var $el = $(el);
  this.el = el;
  this.$el = $el;
  _.each(this.events, function(action, key){
    var matches = key.match(/^\s*(\S+)(\s+(.+))?$/i);
    if (!matches) {
      return;
    }
    var eventType = matches[1];
    var selector = matches[3];
    var handler = _.bind(function(ev){
      this[action].apply(this, arguments);
    }, this);
    if (selector) {
      // use delegation
      $el.on(eventType, selector, handler);
    } else {
      // don't use delegation
      $el.on(eventType, handler);
    }
  }, this);
}

/*
 * Taken nearly verbatim from Backbone.
 */
Controller.extend = function(protoProps, staticProps) {
  var parent = this;
  var child;
  if (protoProps && _.has(protoProps, 'constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ return parent.apply(this, arguments); };
  }
  _.extend(child, parent, staticProps);
  var Surrogate = function(){ this.constructor = child; };
  Surrogate.prototype = parent.prototype;
  child.prototype = new Surrogate;
  if (protoProps) _.extend(child.prototype, protoProps);
  child.__super__ = parent.prototype;
  return child;
};

Controller.prototype = {

  /*
   * This can be overridden.
   * It runs at instantiation time, before attached to an element.
   */
  init: function(){},

  /*
   * This can be overridden.
   * It runs after attached to an element.
   */
  mount: function(){},

  _sanitize: function(content){
    var $cntnt = $(content);
    $cntnt.find('script').remove();
    return $cntnt;
  },

  /*
   * Overwrite the content of this DOM subtree.
   */
  html: function(content){
    this.$el.html(this._sanitize(content));
    this.scan();
  },

  /*
   * Append to the content of this DOM subtree.
   */
  append: function(content){
    this.$el.append(this._sanitize(content));
    this.scan();
  },

  /*
   * Prepend to the content of this DOM subtree.
   */
  prepend: function(content){
    this.$el.prepend(this._sanitize(content));
    this.scan();
  },

  /*
   * If the DOM subtree has been modified,
   * check for unbound elements.
   */
  scan: function(){
    this.app.scan(this.el);
  },

  /*
   * Publish an event from this view.
   */
  publish: function(type){
    var args = _slice.call(arguments);
    args[0] = {
      type: type,
      source: this
    };
    return this.app.publish.apply(this.app, args);
  },

  /*
   * Send a message up the DOM tree.
   * Will be handled by any matching handlers
   * in 'below' handlers on controllers.
   */
  up: function(){
    this._comm(false, arguments);
  },

  /*
   * Send a message down the DOM tree.
   * Will be handled by any matching handlers
   * in 'above' handlers on controllers.
   */
  down: function(){
    this._comm(true, arguments);
  },

  /*
   * Helper method to support up and down.
   */
  _comm: function(isDown, args){
    args = _slice.call(args);
    var type = args[0];
    args[0] = {
      type: type,
      source: this
    };
    var $els = isDown
      ? this.$('.' + this.app.tagClass)
      : this.$el.parents('.' + this.app.tagClass);
    var self = this;
    $els.each(function(){
      var el = this;
      _.each(el[self.app.tag], function(that){
        var handlers = that[isDown ? 'above' : 'below'];
        if (!handlers){
          return;
        } else {
          if (handlers.hasOwnProperty(type)){
            try {
              that[handlers[type]].apply(that, args);
            } catch(ex) {
              setTimeout(function(){
                throw ex;
              },0);
            }
          }
        }
      });
      el = el.parentNode;
    });
  },

  _updateDom: function(opts, content){
    if (opts.replace){
      // completely replace this node
      this.$el.before(content);
      this.$el.remove();
      this.app.scan();
    } else {
      // mutate the dom subtree of this node
      if (opts.into){
        this.$(opts.into).html(content);
      } else if (opts.onto){
        this.$(opts.onto).replaceWith(content);
      } else if (opts.before){
        this.$(opts.before).before(content);
      } else if (opts.after){
        this.$(opts.after).after(content);
      } else if (opts.append){
        var $el = opts.append === true
          ? this.$el : this.$(opts.append);
        $el.append(content);
      } else if (opts.prepend){
        var $el = opts.prepend === true
          ? this.$el : this.$(opts.prepend);
        $el.prepend(content);
      } else {
        this.$el.html(content);
      }
      this.scan();
    }
  },

  inject: function(opts, callback, ctx){
    if (opts.content){
      this._updateDom(opts, opts.content);
      callback && callback.call(ctx, null);
    } else if (opts.url){
      var parts = opts.url.match(/^\s*(\S+)(\s+(.*))?/);
      var url = parts[1];
      var sel = parts[3];
      var self = this;
      $.ajax(url, {
        success: function(content){
          if (sel){
            content = $(content).find(sel);
          }
          self._updateDom(opts, content);
          callback && callback.call(ctx, null);
        },
        error: function(xhr){
          var message;
          if (/^4\d\d$/.test(xhr.status)){
            message = 'Client error, status ' + xhr.status;
          } else if (/^5\d\d$/.test(xhr.status)){
            message = 'Server error, status ' + xhr.status;
          } else {
            message = 'Error, status ' + xhr.status;
          }
          var err = new Error(message);
          if (callback){
            callback.call(ctx, err);
          } else {
            throw err;
          }
        }
      });
    }
  },

  load: function(){
    var args = _slice.call(arguments);
    var url = args.shift();
    var callback = args.shift();
    var selector;
    if (typeof callback === 'string'){
      selector = callback;
      callback = args.shift();
    }
    var self = this;
    $.ajax(url, {
      success: function(data){
        var err = null;
        try {
          var $content = $(data);
          if (selector){
            $content = $content.find(selector);
          }
          self.html($content);
        } catch(ex) {
          err = ex;
        }
        callback(err);
      },
      error: function(xhr){
        var message;
        if (/^4\d\d$/.test(xhr.status)){
          message = 'Client error, status ' + xhr.status;
        } else if (/^5\d\d$/.test(xhr.status)){
          message = 'Server error, status ' + xhr.status;
        } else {
          message = 'Error, status ' + xhr.status;
        }
        callback(new Error(message));
      }
    });
  },

  /*
   * Convenience $el.find() on DOM subtree.
   */
  $: function(){
    return this.$el.find.apply(this.$el, arguments);
  }
};

// ########################################################################

/**
 * Main export from this library. Use it to create an "app".
 *
 * var freeloader = require('freeloader');
 * var app = freeloader();
 * app.bind('div.foo', { ... });
 */
module.exports = function(_options){

  /*
   * By convention, variables local to this function
   * are prepended by _underscores.
   */

  _options = _.extend({
    prefix: '__fl_',
    root: '/'
  }, _options);

  if (!/^\//.test(_options.root)){
    _options.root = '/' + _options.root;
  }
  if (!/\/$/.test(_options.root)){
    _options.root = _options.root + '/';
  }

  function _pageLoadError(err, url){
    //debugger;
    _app.trigger('navigation-error', err, url);
  }

  var _loaded = false;
  $(function(){
    _loaded = true;
  });

  var _docEl = document.documentElement;

  /*
   * This is the list of controller bindings that freeloader
   * manages.
   */
  var _bindings = [];

  /*
   * Utility to generate unique strings local to here.
   */
  var _uString = (function(){
    var count = 0;
    return function(){
      return '_' + count++;
    };
  })();

  /*
   * freeloader tags DOM elements with this property
   * name so it knows which nodes it has seen and
   * which it hasn't.
   */
  var _tag = _options.prefix + ((Math.random()+'').replace(/.*(\d\d\d\d\d\d)$/,'$1'));
  var _tagClass = _options.prefix + '_bound';

  /*
   * Converts an arbitrary string into a valid HTML className.
   * This isn't a 1:1 mapping, for example 'foo bar' and 'foo_bar'
   * both map to 'foo_bar'.
   */
  var _toSubsClassName = (function(){
    var patt = /[^a-z0-9_-]/ig;
    return function(name) {
      name = name.replace(patt, '_');
      return _options.prefix + 'subscribes_' + name;
    };
  })();

  /*
   * This function finds unbound elements and binds them.
   */
  function _scan(root){
    root = root || _docEl;
    var controllers;
    for (var i=0, leni=_bindings.length; i<leni; i++){
      var binding = _bindings[i];
      var $list = $(binding.selector, root);
      for (var j=0, lenj=$list.length; j<lenj; j++){
        var el = $list[j];
        var $el = $(el);
        if (el[_tag] === undefined){
          var tag = el[_tag] = {};
          $el.addClass(_tagClass);
        }
        if (!el[_tag].hasOwnProperty(binding.id)){
          _.each(binding.Controller.prototype.subs, function(val, name){
            $el.addClass(_toSubsClassName(name));
          });
          var controller = new binding.Controller(el, _app);
          el[_tag][binding.id] = controller;
          controller._tagClass = _tagClass;
          controller._tag = _tag;
          controllers || (controllers = []);
          controllers.push(controller);
        }
      }
    }
    controllers && _.each(controllers, function(controller){
      try {
        controller.mount();
      } catch(ex) {
        setTimeout(function(){
          // throw from within a timeout in order to prevent
          // it from screwing up everyone else's stuff but
          // still show it in developer console
          throw ex;
        });
      }
    });
  }

  /*
   * Get a list of elements bound to controllers that
   * subscribe to a given name.
   */
  var _getElsBySubName = (function(){
    var byClass = (function(){
      var lists = {};
      var hasGEBCN = typeof _docEl.getElementsByClassName === 'function';
      var hasQSA = typeof _docEl.querySelectorAll === 'function';
      if (hasGEBCN) {
        return function(className){
          var list = lists[className];
          if (!list) {
            list = lists[className] = _docEl.getElementsByClassName(className);
          }
          return list;
        };
      } else if (hasQSA) {
        return function(className){
          return _docEl.querySelectorAll('.'+className);
        };
      } else {
        return function(className){
          return $('.'+className).toArray();
        };
      }
    })();
    return function(name){
      // _toSubsClassName() may occasionally map two different names
      // to the same className. In the worst case, such collisions
      // won't break this behavior, but may cause a performance
      // hit, since the purpose of looking up things by className is
      // to narrow the search space when finding elements that
      // subscribe to a given name.
      return byClass(_toSubsClassName(name));
    };
  })();

  /*
   * Scan the document on DOM ready.
   */
  $(function(){
    _scan();
  });

  // ########################################################################

  /*
   * A function that takes a string of HTML and returns a document object.
   */
  var _parser = (function(){

    /*
     * Checks whether a given createDocument function actually works.
     */
    function test(createDocument){
      try {
        var testDoc = createDocument('<html><body><p>test');
        return testDoc && testDoc.body && testDoc.body.childNodes.length === 1;
      } catch(err) {
        return false;
      }
    }

    /*
     * Use one of these to create new documents.
     */
    var candidates = [{
      name: 'DOMParser',
      parse: function(html){
        return (new DOMParser()).parseFromString(html, 'text/html');
      }
    },{
      name: 'createHTMLDocument (innerHTML)',
      parse: function(html){
        var doc = document.implementation.createHTMLDocument('');
        doc.documentElement.innerHTML = html;
        return doc;
      }
    },{
      name: 'createHTMLDocument (write)',
      parse: function(html){
        var doc = document.implementation.createHTMLDocument('');
        doc.open('replace');
        doc.write(html);
        doc.close();
        return doc;
      }
    },{
      name: 'iframe.contentWindow.document',
      parse: function(html){
        var iframe = document.createElement('iframe');
        iframe.src = 'about:blank';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        var doc = iframe.contentWindow.document;
        doc.open('replace');
        doc.write(html);
        doc.close();
        document.body.removeChild(iframe);
        return doc;
      }
    }];

    /*
     * From list of candidates, return first successful one.
     */
    return _.find(candidates, function(candidate){
      return test(candidate.parse);
    });
  })();

  /*
   * Executes any new css/scripts in an incoming document.
   */
  var _processCssJs = (function(){
    var loadedScripts = {};
    var loadedStyleSheets = {};
    $('script[src]').each(function(){
      var url = this.getAttribute('src');
      loadedScripts[url] = true;
    });
    $('link[type="text/css"][href]').each(function(){
      var url = this.getAttribute('href');
      loadedStyleSheets[url] = true;
    });
    return function(incomingDoc, callback){
      var $docEl = $(incomingDoc.documentElement);
      var loads = [];
      $docEl.find('script[src]').each(function(){
        var url = this.getAttribute('src');
        if (!loadedScripts[url]){
          $(this).remove();
          loads.push($.getScript(url));
          loadedScripts[url] = true;
        }
      });
      $docEl.find('link[rel="stylesheet"][href]').each(function(){
        var url = this.getAttribute('href');
        if (!loadedStyleSheets[url]){
          $(this).remove().appendTo('head');
          loadedStyleSheets[url] = true;
        }
      });
      if (loads.length > 0){
        $.when.apply($, loads).done(function(){
          callback();
        });
      } else {
        callback();
      }
    };
  })();

  function _updatePage(newDoc, callback){
    callback = doubleBack(callback);
    _processCssJs(newDoc, callback);
    var oldDoc = document;
    oldDoc.title = newDoc.title;
    var newBody = newDoc.body;
    newBody.parentNode.removeChild(newBody);
    var oldBody = oldDoc.body;
    oldBody.parentNode.removeChild(oldBody);
    oldDoc.documentElement.appendChild(newBody);
    $('[autofocus]').eq(0).focus();
    _app.scan(oldDoc);
    callback();
  }

  // ########################################################################

  var _history = (function(){

    /*
     * Same regardless of implementation.
     */
    var common = {
      start: function(){
        this._setup();
        this.onPopState(function(ev){
          var url = ev.state ? ev.state.url : location.pathname + location.search;
          _app._load(url, function(err, doc){
            if (err){
              _pageLoadError(err, url);
            } else {
              _updatePage(doc);
            }
          });
        });
      }
    };

    var hasHistoryApi = window.history
      && typeof window.history.pushState === 'function';

    if (hasHistoryApi){

      /*
       * Client supports history API.
       */
      var ready = false;
      return _.extend(common, {
        _setup: function(){
          $(function(){
            setTimeout(function(){
              ready = true;
            },0);
          });
        },
        pushState: function(state, url){
          window.history.pushState(state, '', url);
        },
        replaceState: function(state, url){
          window.history.replaceState(state, '', url);
        },
        onPopState: function(callback, ctx){
          var callback = _.bind(callback, ctx);
          $(window).on('popstate', function(ev){
            if (!ready){
              // avoid webkit's onload popstate
              return;
            }
            return callback.apply(this, arguments);
          });
        },
        getFragment: function(){
          return '/' + (location.pathname + location.search).replace(/^\//,'');
        }
      });
    } else {

      /*
       * No history API, fallback to hash state.
       */
      var states = {};
      var callbacks = [];
      var back = true;
      return _.extend(common, {
        _setup: function(){
          $(window).on('hashchange', function(ev){
            if (back){
              var url = _options.root + location.hash.substring(1);
              _.each(callbacks, function(callback){
                callback({
                  state: states[url]
                });
              });
            } else {
              back = true;
            }
          });
          if (location.pathname !== _options.root){
            var hash = '#' + location.pathname.substring(_options.root.length);
            location.replace(_options.root+location.search + hash);
          } else if (location.hash){
            var url = _options.root + location.hash.substring(1) + location.search;
            _app._load(url, function(err, doc){
              if (err){
                _pageLoadError(err, url);
              } else {
                _updatePage(doc);
              }
            });
          }
        },
        pushState: function(state, url){
          back = false;
          states[url] = state;
          var hash = '#' + url.substring(1);
          if (url.indexOf(_options.root) === 0){
            hash = '#' + url.substring(_options.root.length);
          }
          location.href = hash;
        },
        replaceState: function(state, url){
          back = false;
          states[url] = state;
          var hash = '#' + url.substring(1);
          if (url.indexOf(_options.root) === 0){
            hash = '#' + url.substring(_options.root.length);
          }
          location.replace(hash);
        },
        onPopState: function(callback, ctx){
          callbacks.push(_.bind(callback, ctx));
        },
        getFragment: function(){
          return '/' + (location.hash + location.search).replace(/^#/,'');
        }
      });
    }
  })();

  // ########################################################################

  /*
   * The object to be exported.
   */
  var _app = {

    /**
     * Bind a selector to a controller.
     * 
     * // Example 1: basic controller
     * var MyController = freeloader.Controller.extend({ ... });
     * app.bind('div.foo', MyController)
     * 
     * // Example 2: shorthand for above if you don't need
     * // to preserve a reference to MyController and don't
     * // need to use inheritance. in which case .extend()
     * // is called internally.
     * app.bind('div.foo', { ... });
     * 
     * // Example 3: using inheritance
     * var FooController = freeloader.Controller.extend({ ... });
     * var FooBarController = FooController.extend({ ... });
     * app.bind('div.foo', FooController)
     * app.bind('div.foo.bar', FooBarController)
     */
    bind: function(selector, AController){

      if (!(AController.prototype instanceof Controller)){
        AController = Controller.extend(AController);
      }

      /*
       * Save this binding in the list.
       */
      _bindings.push({
        Controller: AController,
        id: _uString(),
        selector: selector
      });

      /*
       * Rescan the page if we're past the initial
       * load event.
       */
      if (_loaded){
        _scan();
      }
    },

    /**
     * Send a notification to any controllers that happen
     * to be live in the DOM and listening.
     */
    publish: function(){
      var args = _slice.call(arguments);
      if (typeof args[0] === 'string'){
        args[0] = {type:args[0]};
      }
      var type = args[0].type;
      var subscribingEls = _getElsBySubName(type);
      for (var i=0, len=subscribingEls.length; i<len; i++){
        var tag = subscribingEls[i][_tag];
        _.each(tag, function(controller){
          var subs = controller.subs;
          if (subs && subs[type]) {
            try {
              controller[subs[type]].apply(controller, args);
            } catch(ex) {
              setTimeout(function(){
                throw ex;
              },0)
            }
          }
        });
      }
    },

    /**
     * A function that uses XHR to GET an HTML page and passes a
     * document object to the callback.
     * 
     * freeloader.load('/page.html', function(err, document){
     *   if (err){
     *     // handle the error
     *   } else {
     *     // do something with document
     *   }
     * });
     */
    _load: function(url, cb, ctx){
      function handleResponse(){
        try {
          if (!xhr.status) throw new Error('failed request');
          var doc = _parser.parse(xhr.responseText);
          cb.call(ctx, null, doc, xhr);
        } catch(ex) {
          cb.call(ctx, ex, null, xhr);
        }
      }
      // prevent an older fetch from clobbering a newer fetch
      if (_app._fetch && _app._fetch.readyState !== 4){
        _app._fetch.abort();
      }
      var xhr = _app._fetch = $.ajax(url, {
        type: 'GET',
        dataType: 'html',
        success: handleResponse,
        error: handleResponse
      });
    },

    on: function(eventName, cb, ctx){
      var handlers = this._eventHandlers;
      if (!handlers){
        handlers = this._eventHandlers = {};
      }
      if (!handlers[eventName]){
        handlers[eventName] = [];
      }
      handlers[eventName].push({cb:cb,ctx:ctx});
    },

    trigger: function(eventName){
      var handlers = this._eventHandlers;
      if (!handlers || !handlers[eventName]){
        return;
      }
      var args = _slice.call(arguments);
      args.shift();
      handlers[eventName].forEach(function(h){
        h.cb.apply(h.ctx, args);
      });
    },

    /**
     * Go to a new page URL using XHR to quickly load the page.
     */
    navigate: function(url, callback, ctx){
      if (url.indexOf(_options.root) !== 0){
        location.href = url;
        return;
      }
      this._load(url, function(err, doc, xhr){
        if (err){
          callback(err);
        } else {
          callback = doubleBack(callback, ctx);
          _updatePage(doc, callback);
          window.scrollTo(0,0);
          _history.pushState({url:url}, url);
          callback();
        }
      });
    },

    reload: function(callback, ctx){
      var url = _history.getFragment();
      this.navigate(url, callback, ctx);
    },

    scan: _scan,
    tag: _tag,
    tagClass: _tagClass
  };

  // ########################################################################

  /*
   * Make sure the back button works.
   */
  _history.start();

  // ########################################################################

  return _app;
};

// ########################################################################

module.exports.Controller = Controller;
