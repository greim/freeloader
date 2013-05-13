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
        window.freeloader = cb(jQuery);
    };

    /*
     * By convention, variables local to this define callback
     * are prepended by _underscores.
     */
    define(['jquery'], function($){

        var _loaded = false;
        $(function(){ _loaded = true; });
        var _docEl = document.documentElement;
        var _slice = [].slice;

        /*
         * This is the list of specifications that freeloader
         * manages.
         */
        var _specs = [];

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
        var _tag = '__fl' + ((Math.random()+'').replace(/.*(\d\d\d\d)$/,'$1'));

        /*
         * Converts an arbitrary string into a valid HTML className.
         * This isn't a 1:1 mapping, for example 'foo bar' and 'foo_bar'
         * both map to 'foo_bar'.
         */
        var _toSubsClassName = (function(){
            var patt = /[^a-z0-9_-]/ig;
            return function(name) {
                name = name.replace(patt, '_');
                return _tag + '_subscribes_' + name;
            };
        })();

        /*
         * This function finds unbound elements and binds them.
         */
        function _scan(cb, root){
            root = root || _docEl;
            for (var i=0, leni=_specs.length; i<leni; i++){
                var Spec = _specs[i];
                var $list = $(Spec.selector, root);
                for (var j=0, lenj=$list.length; j<lenj; j++){
                    var el = $list[j];
                    if (el[_tag] === undefined){
                        var tag = el[_tag] = {};
                        _iterateObj(Spec.prototype.subscriptions, function(name, val){
                            $(el).addClass(_toSubsClassName(name));
                        });
                    }
                    if (!el[_tag].hasOwnProperty(Spec.id)){
                        el[_tag][Spec.id] = new Spec(el);
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

        /*
         * Utility to iterate through the names and values of
         * objects.
         */
        function _iterateObj(obj, cb){
            if (!obj) {
                return;
            }
            for (var name in obj) {
                if (!obj.hasOwnProperty(name)){
                    continue;
                }
                cb(name, obj[name]);
            }
        }

        /*
         * This is a superclass that all spec classes will
         * extend. Descendant instances will be 'this' in all
         * spec methods, and have el and $el properties.
         */
        function Spec(el){
            var self = this;
            var $el = $(el);
            self.el = el;
            self.$el = $el;
            _iterateObj(self.events, function(key, action){
                var matches = key.match(/^\s*(\S+)(\s+(.+))?$/i);
                if (!matches) {
                    throw new Error('malformed event string: '+key);
                }
                var eventType = matches[1];
                var selector = matches[3];
                var handler = function(ev){
                    self[action].apply(self, arguments);
                };
                if (selector) {
                    // use delegation
                    $el.on(eventType, selector, handler);
                } else {
                    // don't use delegation
                    $el.on(eventType, handler);
                }
            });
            self.initialize();
        }

        /*
         * This function's job is to keep the prototype
         * chain intact.
         */
        Spec.extend = function(protoProps) {
            var parent = this;
            var ChildSpec = function(){ return parent.apply(this, arguments); };
            var Surrogate = function(){ this.constructor = ChildSpec; };
            Surrogate.prototype = parent.prototype;
            ChildSpec.prototype = new Surrogate;
            $.extend(ChildSpec.prototype, protoProps);
            return ChildSpec;
        };

        Spec.prototype = {

            /*
             * If things are not overridden by the spec, these
             * no-op versions are used.
             */
            initialize: _noop,

            /*
             * Called internally by freeloader.publish(). In turn
             * calls an instance method.
             */
            publish: function(name){
                if (this.subscriptions && this.subscriptions[name]) {
                    var args = _slice.call(arguments, 1);
                    this[this.subscriptions[name]].apply(this, args);
                }
            },

            /*
             * Convenience $.find() on the DOM subtree.
             */
            $: function(){
                return this.$el.find.apply(this.$el, arguments);
            }
        };

        /*
         * This is the object to be exported.
         */
        var _freeloader = {};

        /**
         * This creates a specification for a DOM element.
         * Its single argument is a specification object.
         */
        _freeloader.bind = function(selector, spec){

            /*
             * A spec is a constructor with a static id.
             */
            var ChildSpec = Spec.extend(spec);
            ChildSpec.id = _uString();
            ChildSpec.selector = selector;

            /*
             * Save this spec in the list.
             */
            _specs.push(ChildSpec);

            /*
             * Rescan the page if we're past the initial
             * load event.
             */
            if (_loaded) {
                _scan();
            }
        };

        /**
         * Send a notification to any controllers that happen
         * to be live in the DOM and listening.
         */
        _freeloader.publish = function(name){
            var pubArgs = arguments;
            var subscribingEls = _getElsBySubName(name);
            for (var i=0, len=subscribingEls.length; i<len; i++){
                var tag = subscribingEls[i][_tag];
                for (var specId in tag) {
                    if (tag.hasOwnProperty(specId)) {
                        tag[specId].publish.apply(tag[specId], pubArgs);
                    }
                }
            }
        };

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

        /*
         * A function that fetches a page and passes a
         * document object to the callback.
         * 
         *     freeloader.load('/page.html', {
         *         data: { foo: 'bar' }, // sends ?foo=bar (optional)
         *         success: function(doc) { ... }, // operate on the returned document object
         *         error: function() { ... } // handle an error
         *     });
         */
        _freeloader.load = function(url, args){
            args = args || {};
            var newArgs = $.extend({}, args, {
                type: 'GET',
                dataType: 'html',
                data: args.data,
                success: function(html){
                    if (typeof args.success !== 'function') {
                        return;
                    }
                    var doc = _parseDocument(html);
                    args.success.call(args.context, doc);
                },
                error: function(xhr, status, message){
                    if (typeof args.error !== 'function') {
                        return;
                    }
                    args.error.apply(args.context, arguments);
                }
            });
            $.ajax(url, newArgs);
        };

        /*
         * Helper plugin for binding new elements:
         * $(stuff).append(moreStuff).freeloader();
         */
        $.fn.freeloader = function(){
            this.each(function(){
                if (!$.contains(_docEl, this)) {
                    throw new Error('freeloader() called on non-live node');
                }
                _scan(undefined, this);
            });
            return this;
        };

        /*
         * Return from the define() call.
         */
        return _freeloader;
    });
})(window);









