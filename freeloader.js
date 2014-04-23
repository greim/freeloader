var _ = require('lodash-node');
var $ = require('jquery-browserify')
var _slice = [].slice;

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
  var $el = $(el);
  this.el = el;
  this.$el = $el;
  this._app = app;
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
   */
  init: function(){},

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
    this._app.scan(this.el);
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
    return this._app.publish.apply(this._app, args);
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
      ? this.$('.' + this._app.tagClass)
      : this.$el.parents('.' + this._app.tagClass);
    var self = this;
    $els.each(function(){
      var el = this;
      _.each(el[self._app.tag], function(that){
        var handlers = that[isDown ? 'above' : 'below'];
        if (!handlers){
          return;
        } else {
          if (handlers.hasOwnProperty(type)){
            that[handlers[type]].apply(that, args);
          }
        }
      });
      el = el.parentNode;
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
    prefix: '__fl_'
  }, _options);

  _errors = {
    xxx: function(err){
      alert(err.message);
    }
  };
  function _doError(err){
    var xxx = 'xxx';
    var status = err.status === undefined ? '' : err.status + '';
    if (status.length > 3 || /\D/.test(status)) status = 'xxx';
    while (status.length < 3) status = '0' + status;
    for (var i=0; i<4; i++){
      var key = status.substring(0,3-i) + xxx.substring(3-i, 3);
      if (_errors.hasOwnProperty(key)){
        _errors[key](err);
        return;
      }
    }
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
          controller.init();
        }
      }
    }
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
  var _parseDocument = (function(){

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
    var candidates = [
      function(html){
        return (new DOMParser()).parseFromString(html, 'text/html');
      },
      function(html){
        var doc = document.implementation.createHTMLDocument('');
        doc.documentElement.innerHTML = html;
        return doc;
      },
      function(html){
        var doc = document.implementation.createHTMLDocument('');
        doc.open('replace');
        doc.write(html);
        doc.close();
        return doc;
      },
      function(html){
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
    ];

    /*
     * From list of candidates, return first successful one.
     */
    return _.find(candidates, function(candidate){
      return test(candidate);
    });
  })();

  function _updatePage(newDoc){
    var oldDoc = document;
    oldDoc.title = newDoc.title;
    var newBody = newDoc.body;
    newBody.parentNode.removeChild(newBody);
    var oldBody = oldDoc.body;
    oldBody.parentNode.removeChild(oldBody);
    oldDoc.documentElement.appendChild(newBody);
    _app.scan(oldDoc.body);
  }

  // ########################################################################

  var _history = (function(){
    var hasPushState = window.history && typeof window.history.pushState === 'function';
    if (hasPushState){
      // client supports history API
      var ready = false;
      $(function(){
        setTimeout(function(){
          ready = true;
        },0);
      });
      return {
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
            console.log(ev.originalEvent)
            return callback.apply(this, arguments);
          });
        }
      };
    } else {
      // no history API, fallback to hash state
      var states = {};
      var callbacks = [];
      var back = true;
      function changeHandler(){
        var url = '/' + location.hash.substring(1);
        if (back && states.hasOwnProperty(url)){
          back = true;
          _.each(callbacks, function(callback){
            callback({
              state: states[url]
            });
          });
        }
      }
      $(window).on('hashchange', function(ev){
        cb.call(ev.state);
      });
      return {
        pushState: function(state, url){
          back = false;
          states[url] = state;
          location.href = '#' + url.substring(1);
        },
        replaceState: function(state, url){
          back = false;
          states[url] = state;
          location.replace('#' + url.substring(1));
        },
        onPopState: function(callback, ctx){
          callbacks.push(_.bind(callback, ctx));
        }
      };
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
            controller[subs[type]].apply(controller, args);
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
      $.ajax(url, {
        type: 'GET',
        dataType: 'html',
        success: function(html){
          var doc = _parseDocument(html);
          cb.call(ctx, null, doc);
        },
        error: function(xhr, status, message){
          var err = new Error('Page fetch returned ' + status + ' for URL ' + url);
          err.status = xhr.status;
          cb.call(ctx, err);
        }
      });
    },

    /**
     * Go to a new page URL using XHR to quickly load the page.
     */
    navigate: function(url){
      _app._load(url, function(err, doc){
        if (!err){
          _updatePage(doc);
          _history.pushState({url:url}, url);
        } else {
          _doError(err);
        }
      });
    },

    /**
     * By default all navigation errors leading to 404s are
     * handled by one function. Set a custom function for 404,
     * 4xx, 500, 5xx errors, etc.
     */
    setErrorPage: function(status, handler, ctx){
      status = status+'';
      if (status.length !== 3 || !/^\d*x*$/.test(status)){
        throw new Error(status + ' is an invalid status code for error page');
      }
      _errors[status] = _.bind(handler, ctx);
    },

    scan: _scan,
    tag: _tag,
    tagClass: _tagClass
  };

  // ########################################################################

  /*
   * Make sure the back button works.
   */
  _history.onPopState(function(ev){
    var url = ev.state ? ev.state.url : location.pathname + location.search;
    _app._load(url, function(err, doc){
      if (!err){
        _updatePage(doc);
      } else {
        _doError(err);
      }
    });
  });

  // ########################################################################

  return _app;
};

// ########################################################################

module.exports.Controller = Controller;
