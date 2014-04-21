/*
Copyright (c) 2013 Greg Reimer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function(window){

  /*
   * If AMD is available, use it, otherwise make freeloader a
   * global variable. This library only runs in browsers.
   */
  var isAmd = typeof window.define === "function" && window.define.amd;
  var define = isAmd ? window.define : function(list, cb){
    window.freeloader = cb(jQuery, _);
  };

  /*
   * By convention, variables local to this define callback
   * are prepended by _underscores.
   */
  define(['jquery','lodash'], function($){

    var _loaded = false;
    $(function(){
      setTimeout(function(){
        _loaded = true;
      },0);
    });
    var _docEl = document.documentElement;
    var _slice = [].slice;

    /*
     * This is the list of controller bindings that freeloader
     * manages.
     */
    var _bindings = [];

    /*
     * For use anywhere we need stuff that doesn't do
     * anything, but don't necessarily want to create
     * new stuff.
     */
    var _noop = function(){};

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
    var _tag = '__fl_' + ((Math.random()+'').replace(/.*(\d\d\d\d\d\d)$/,'$1'));

    /*
     * Converts an arbitrary string into a valid HTML className.
     * This isn't a 1:1 mapping, for example 'foo bar' and 'foo_bar'
     * both map to 'foo_bar'.
     */
    var _toSubsClassName = (function(){
      var patt = /[^a-z0-9_-]/ig;
      return function(name) {
        name = name.replace(patt, '_');
        return _tag + 'subscribes_' + name;
      };
    })();

    /*
     * This function finds unbound elements and binds them.
     */
    function _scan(cb, root){
      root = root || _docEl;
      for (var i=0, leni=_bindings.length; i<leni; i++){
        var binding = _bindings[i];
        var $list = $(binding.selector, root);
        for (var j=0, lenj=$list.length; j<lenj; j++){
          var el = $list[j];
          if (el[_tag] === undefined){
            var tag = el[_tag] = {};
            _.each(binding.Controller.prototype.subs, function(val, name){
              $(el).addClass(_toSubsClassName(name));
            });
          }
          if (!el[_tag].hasOwnProperty(binding.id)){
            el[_tag][binding.id] = new Controller(el);
          }
          cb && cb(el);
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
    $(_scan);

    // ########################################################################

    /*
     * This is a superclass that all controller classes will
     * extend. Descendant instances will be 'this' in all
     * controller methods, having el, $el, and $ properties.
     */
    function Controller(el){
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
      this.init();
    }

    /*
     * This function's job is to keep the prototype
     * chain intact.
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
      init: _noop,

      /*
       * Overwrite the content of this DOM subtree.
       */
      html: function(content){
        this.$el.html(content);
        this.scan();
      },

      /*
       * Append to the content of this DOM subtree.
       */
      append: function(content){
        this.$el.append(content);
        this.scan();
      },

      /*
       * Prepend to the content of this DOM subtree.
       */
      prepend: function(content){
        this.$el.prepend(content);
        this.scan();
      },

      /*
       * Publish an event from this view.
       */
      publish: function(name){
        var args = _slice(arguments);
        args[0] = {
          name: name,
          source: this
        };
        return _freeloader.publish.apply(freeloader, args);
      },

      /*
       * If the DOM subtree has been modified, check for unbound elements.
       */
      scan: function(){
        _scan(this.el);
      },

      /*
       * Convenience $.find() on the DOM subtree.
       */
      $: function(){
        return this.$el.find.apply(this.$el, arguments);
      }
    };

    // ########################################################################

    /*
     * A function that takes a string of HTML and returns a document object.
     */
    var _parseDocument = (function(){
      function createDocumentUsingParser(html) {
        return (new DOMParser()).parseFromString(html, 'text/html');
      }
      function createDocumentUsingDOM(html) {
        var doc = document.implementation.createHTMLDocument('');
        doc.documentElement.innerHTML = html;
        return doc;
      }
      function createDocumentUsingWrite(html) {
        var doc = document.implementation.createHTMLDocument('');
        doc.open('replace');
        doc.write(html);
        doc.close();
        return doc;
      }
      /*
       * Use createDocumentUsingParser if DOMParser is defined and natively
       * supports 'text/html' parsing (Firefox 12+, IE 10)
       * 
       * Use createDocumentUsingDOM if createDocumentUsingParser throws an exception
       * due to unsupported type 'text/html' (Firefox < 12, Opera)
       * 
       * Use createDocumentUsingWrite if:
       *  - DOMParser isn't defined
       *  - createDocumentUsingParser returns null due to unsupported type 'text/html' (Chrome, Safari)
       *  - createDocumentUsingDOM doesn't create a valid HTML document (safeguarding against potential edge cases)
       */
      var parser;
      if (window.DOMParser) {
        try {
          var testDoc = createDocumentUsingParser('<html><body><p>test');
          if (testDoc && testDoc.body && testDoc.body.childNodes.length === 1) {
            parser = createDocumentUsingParser;
          }
        } catch(ex) {
          parser = createDocumentUsingDOM;
        }
      }
      if (!parser) {
        parser = createDocumentUsingWrite;
      }
      return parser;
    })();

    function updatePage(doc){
      document.title = doc.title;
      var body = doc.body;
      body.parentNode.removeChild(body);
      document.body = body;
      _freeloader.scan(document.body);
    }

    // ########################################################################

    var _history = (function(){
      var hasPushState = window.history && typeof window.history.pushState === 'function';
      if (hasPushState){
        return {
          pushState: function(state, url){
            window.history.pushState(state, '', url);
          },
          replaceState: function(state, url){
            window.history.replaceState(state, '', url);
          },
          onPopState: function(callback, ctx){
            $(window).on('popstate', _.bind(callback, ctx));
          }
        };
      } else {
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
    var _freeloader = {

      /**
       * Bind a selector to a controller. Return the controller.
       */
      bind: function(selector, AController){

        if (!(AController instanceof Controller)){
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
        if (_loaded) {
          _scan();
        }

        return AController;
      },

      /**
       * Send a notification to any controllers that happen
       * to be live in the DOM and listening.
       */
      publish: function(name){
        var args = _slice.call(arguments);
        if (typeof name === 'string'){
          args[0] = {name:name};
        }
        var subscribingEls = _getElsBySubName(name);
        for (var i=0, len=subscribingEls.length; i<len; i++){
          var tag = subscribingEls[i][_tag];
          for (var bindingId in tag) {
            if (tag.hasOwnProperty(bindingId)) {
              var controller = tag[bindingId];
              if (controller.subs && controller.subs[name]) {
                controller[controller.subs[name]].apply(controller, args);
              }
            }
          }
        }
      },

      /**
       * A function that uses XHR to GET an HTML page and passes a
       * document object to the callback.
       * 
       *     freeloader.load('/page.html', function(err, document){
       *       if (err){
       *         // handle the error
       *       } else {
       *         // do something with document
       *       }
       *     });
       */
      load: function(url, cb, ctx){
        args = args || {};
        $.ajax(url, {
          type: 'GET',
          dataType: 'html',
          success: function(html){
            var doc = _parseDocument(html);
            cb.call(ctx, null, doc);
          },
          error: function(xhr, status, message){
            cb.call(ctx, new Error('Page fetch returned ' + status + ' for URL ' + url));
          }
        });
      },

      navigate: function(url, cb, ctx){
        _freeloader.load(url, function(err, doc){
          if (!err){
            updatePage(doc);
            _history.pushState({url:url}, url);
          }
        });
      },

      scan: _scan,
      Controller: Controller
    };

    // ########################################################################

    /*
     * Make sure the back button works.
     */
    _history.onPopState(function(ev){
      var url = ev.state ? ev.state.url : location.pathname + location.search;
      _freeloader.load(url, function(err, doc){
        if (!err){
          updatePage(doc);
        }
      });
    });

    // ########################################################################

    /*
     * Return from the define() call.
     */
    return _freeloader;
  });
})(window);









