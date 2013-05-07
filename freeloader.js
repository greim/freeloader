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
        var _tag = '__fl' + _uString();

        /*
         * This function matches behavioral specs to DOM elements.
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
                    }
                    if (!el[_tag].hasOwnProperty(Spec.id)){
                        el[_tag][Spec.id] = new Spec(el);
                    }
                    cb && cb(el);
                }
            }
        }

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
                return $.find.apply(this.$el, arguments);
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
         * Send a notification to any instance elements that
         * happen to be listening. Accepts a type string and
         * any optional arguments.
         */
        _freeloader.publish = function(name){
            var pubArgs = arguments;
            _scan(function(el){
                _iterateObj(el[_tag], function(id, instance){
                    instance.publish.apply(instance, pubArgs);
                });
            });
        };

        /*
         * A function that takes a string of HTML and returns a document object.
         */
        var _parseDocument = (function() {
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
         */
        function getUrl(url, callback){
            $.ajax(url, {
                type: 'GET',
                dataType: 'html',
                success: function(html){
                    var doc = _parseDocument(html);
                    callback(null, doc);
                },
                error: function(xhr, status, message){
                    callback(new Error(message));
                }
            });
        };

        /*
         * Args class with default properties for customizing navigate actions.
         */
        function Args(args){
            $.extend(this, args);
        };

        Args.prototype = {

            /*
             * String parameter controlling how content is copied from the
             * new page to the existing page. Can take one of these values:
             * 
             *     "replace" - from replaces to[0].
             *     "replaceChildren" - from[0]'s children replace to[0]'s children.
             *     "inject" - from replaces to[0]'s children.
             *     "append" - from is inserted after to[0]'s children.'
             *     "prepend" - from is inserted before to[0]'s children.
             *
             * Where from/to is the set of elements matching the from/to selectors below. Defaults to "replace".
             */
            mode: 'replace',

            /*
             * A jQuery selector which determines where in the newly-loaded
             * DOM to get the content from. Defaults to 'body'.
             */
            from: 'body',

            /*
             * A jQuery selector which determines where in the existing
             * DOM the new content will go. Defaults to 'body'.
             */
            to: 'body',

            /*
             * Callback to run once the DOM has been loaded and inserted
             * into the DOM. Optional.
             */
            onload: function(){},

            /*
             * Callback to run if there's an error fetching the page. Optional.
             */
            onerror: function(error, url){
                location.href = url;
            },

            /*
             * Whether the page should be scrolled to top once the content
             * has been loaded. Defaults to true.
             */
            scrollToTop: true,

            /*
             * Whether the page title should be updated once the content
             * has been loaded. Defaults to true.
             */
            updateTitle: true,

            /*
             * Whether the URL will be updated using the history API. Defaults
             * to true.
             */
            pushState: true,

            /*
             * Function to handle cases where the history API isn't supported
             * in the user's browser. Explicitly returning false from this
             * function prevents the operation from proceeding. The default
             * behavior is to set window.location.href = url and then return
             * false.
             */
            pushStateFallback: function(url){
                location.href = url;
                return false;
            }
        };

        /*
         * Navigate to a new page, but instead of refreshing the whole page,
         * do an ajax fetch and update specific parts of the DOM. This avoids
         * the overhead of reloading JS and CSS, and otherwise rebuilding the
         * overall window environment. This also automatically binds freeloader
         * specs to appropriate elements.
         */
        var _hasPushState = typeof window.pushState === 'function';
        _freeloader.navigate = function(url, args, ctx){
            args = new Args(args);
            if (args.pushState) {
                if (!_hasPushState) {
                    var res = args.pushStateFallback(url);
                    if (res !== undefined && !res) {
                        return;
                    }
                } else {
                    window.pushState(url);
                }
            }
            getUrl(url, function(err, doc){
                if (err) {
                    args.onerror.call(ctx, err, url);
                } else {
                    _load($(doc).find(args.from), $(args.to).eq(0), args.mode);
                    if (args.updateTitle) {
                        document.title = doc.title;
                    }
                    if (args.scroll) {
                        window.scrollTo(0,0);
                    }
                    args.onload.call(ctx);
                }
            });
        };

        /*
         * Function to load DOM on the page, and also bind freeloader specs.
         * Usage: freeloader.load(from, to, mode);
         * @param from - elements to load content from. can be anything that goes in $(...)
         * @param to - elements to load content into. can be anything that goes in $(...)
         * @param mode - how to transfer the content. follows same rules as above.
         */
        var _load = function(from, to, mode){
            var $to = $(to).eq(0);
            var $from = $(from);
            if (mode === 'replaceChildren') {
                $from = $from.children();
                $from.remove();
                $to.html($from);
            } else if (mode === 'inject') {
                $from.remove();
                $to.html($from);
            } else if (mode === 'prepend') {
                $from.remove();
                $to.prepend($from);
            } else if (mode === 'append') {
                $from.remove();
                $to.append($from);
            } else { // replace
                $from.remove();
                $to.replaceWith($from);
            }
            $from.freeloader();
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









