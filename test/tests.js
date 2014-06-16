var freeloader = require('../freeloader');
var $ = require('jquery');
var assert = require('assert')

var app = freeloader();

afterEach(function(){
  app._reset();
  $(document.body).empty();
});

describe('freeloader.bind()', function(){

  it('should bind bare object', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { init: 'init' },
      init: function(){
        done();
      }
    });
  });

  it('should bind extended object', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', freeloader.Controller.extend({
      life: { init: 'init' },
      init: function(){
        done();
      }
    }));
  });

  it('should not bind unextended Controller', function(){
    assert.throws(function(){
      app.bind('#test', freeloader.Controller);
    });
  });
});

describe('Controller', function(){

  it('should init', function(done){
    $('body').append('<div id="test1"></div>');
    app.bind('#test1', {
      life: { init: 'init' },
      init: function(){
        done();
      }
    });
  });

  it('should mount', function(done){
    $('body').append('<div id="test2"></div>');
    app.bind('#test2', {
      life: { mount: 'mount' },
      mount: function(){
        done();
      }
    });
  });

  it('one should bind on multiple elements', function(done){
    $('body').append('<div class="test"></div><div class="test"></div>');
    var mountCount = 0;
    app.bind('.test', {
      life: { mount: 'mount' },
      mount: function(){
        mountCount++;
        if (mountCount === 2){
          done();
        }
      }
    });
  });

  it('multiple should bind on one element', function(done){
    $('body').append('<div class="test"></div>');
    var mountCount = 0;
    var C = freeloader.Controller.extend({
      life: { mount: 'mount' },
      mount: function(){
        mountCount++;
        if (mountCount === 2){
          done();
        }
      }
    });
    app.bind('.test', C);
    app.bind('.test', C);
  });
});

describe('Controller inheritance', function(){

  var MyController1 = freeloader.Controller.extend({ foo: function(){} });
  var MyController2 = MyController1.extend({ bar: function(){} });

  it('should prototype chain', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', MyController2.extend({
      life: { mount: 'mount' },
      mount: function(){
        assert.ok(this instanceof freeloader.Controller);
        assert.ok(this instanceof MyController1);
        assert.ok(this instanceof MyController2);
        done();
      }
    }));
  });

  it('should inherit', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', MyController2.extend({
      life: { mount: 'mount' },
      mount: function(){
        assert.equal('function', typeof this.foo);
        assert.equal('function', typeof this.bar);
        done();
      }
    }));
  });

  it('should prototype', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', MyController2.extend({
      life: { mount: 'mount' },
      mount: function(){
        assert.ok(!this.hasOwnProperty('foo'));
        assert.ok(!this.hasOwnProperty('bar'));
        done();
      }
    }));
  });
});

describe('Controller lifecycle events', function(){

  it('should lifecycle', function(done){
    $('body').append('<div id="test3"></div>');
    var result = '';
    app.bind('#test3', {
      life: {
        init: 'init',
        mount: 'mount'
      },
      init: function(){
        result += 'a';
      },
      mount: function(){
        result += 'b';
        assert.equal('ab', result);
        done();
      }
    });
  });

  it('should lifecycle multi', function(done){
    $('body').append('<div id="test3"></div>');
    var result = '';
    app.bind('#test3', {
      life: {
        init: ['init1','init2'],
        mount: ['mount1','mount2']
      },
      init1: function(){
        result += 'a';
      },
      init2: function(){
        result += 'b';
      },
      mount1: function(){
        result += 'c';
      },
      mount2: function(){
        result += 'd';
        assert.equal('abcd', result);
        done();
      }
    });
  });

  it('should have correct this in mount and init', function(done){
    $('body').append('<div class="test"></div>');
    var C = freeloader.Controller.extend({
      life: {
        init: 'init',
        mount: 'mount'
      },
      init: function(){
        assert.ok(this instanceof C);
      },
      mount: function(){
        assert.ok(this instanceof C);
        done();
      }
    });
    app.bind('.test', C);
  });

  it('should have an app property when inited', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { init: 'init' },
      init: function(){
        assert.ok(this.app === app);
        done();
      }
    });
  });

  it('should have an el property when mounted', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        assert.ok(this.el && this.el.parentNode);
        done();
      }
    });
  });

  it('should have an $el property when mounted', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        assert.ok(this.$el && this.$el instanceof $);
        assert.strictEqual(this.$el.get(0), this.el);
        done();
      }
    });
  });

  it('should be live in the DOM when mounted', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        assert.ok($.contains(document.documentElement, this.el));
        done();
      }
    });
  });

  it('should have a $ property when mounted', function(done){
    $('body').append('<div id="test"><br></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        assert.strictEqual(1, this.$('br').length);
        done();
      }
    });
  });
});

describe('Controller DOM events', function(){

  it('should accept empty event objects', function(){
    app.bind('#test', { events: {} });
  });

  it('should accept non-empty event objects', function(){
    app.bind('#test', { events: { 'click': 'foo' } });
  });

  it('should handle a direct DOM event', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.$el.trigger('click');
      },
      events: {'click':'handleClick'},
      handleClick: function(){
        done();
      }
    });
  });

  it('should handle a delegated DOM event', function(done){
    $('body').append('<div id="test"><span></span></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.$('span').trigger('click');
      },
      events: {'click span':'handleClick'},
      handleClick: function(){
        done();
      }
    });
  });

  it('should have correct this in handler', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.$el.trigger('click');
      },
      events: {'click':'handleClick'},
      handleClick: function(ev){
        assert.ok(this instanceof freeloader.Controller);
        done();
      }
    });
  });

  it('should have correct args in handler', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.$el.trigger('click');
      },
      events: {'click':'handleClick'},
      handleClick: function(ev){
        assert.ok(ev);
        assert.ok(typeof ev.preventDefault === 'function');
        done();
      }
    });
  });

  it('should fail on missing method', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        var self = this;
        assert.throws(function(){
          self.$el.trigger('click');
        });
        done();
      },
      events: {'click':'handleClick'}
    });
  });
});

describe('Controller subscriptions', function(){

  it('should work', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.publish('baz');
      },
      subs: {'baz':'baz'},
      baz: function(ev){
        done();
      }
    });
  });

  it('should work synchronously', function(done){
    $('body').append('<div id="test"></div>');
    var result = '';
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.publish('baz');
        result += 'b';
        assert.equal('ab',result);
        done();
      },
      subs: {'baz':'baz'},
      baz: function(ev){
        result += 'a';
      }
    });
  });

  it('should work locally', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.publish('baz');
      },
      subs: {'baz':'baz'},
      baz: function(ev){
        assert.strictEqual(this, ev.source);
        done();
      }
    });
  });

  it('should work globally', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.app.publish('baz');
      },
      subs: {'baz':'baz'},
      baz: function(ev){
        assert.strictEqual(undefined, ev.source);
        done();
      }
    });
  });

  it('should have this', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.publish('baz');
      },
      subs: {'baz':'baz'},
      baz: function(ev){
        assert.ok(this instanceof freeloader.Controller);
        done();
      }
    });
  });

  it('should pass args', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.publish('baz', 0, false);
      },
      subs: {'baz':'baz'},
      baz: function(ev, a1, a2){
        assert.strictEqual(3, arguments.length);
        assert.strictEqual(0, a1);
        assert.strictEqual(false, a2);
        done();
      }
    });
  });

  it('should work multi', function(done){
    $('body').append('<div id="test"></div>');
    var result = '';
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.app.publish('baz');
      },
      subs: {'baz':['baz1','baz2']},
      baz1: function(ev){
        result += 'a';
      },
      baz2: function(ev){
        result += 'b';
        assert.equal('ab', result);
        done();
      }
    });
  });

  it('should fail on missing method', function(done){
    $('body').append('<div id="test"></div>');
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        var self = this;
        assert.throws(function(){
          self.app.publish('baz');
        });
        done();
      },
      subs: {'baz':'baz'}
    });
  });

  it('should not work if not in DOM', function(done){
    $('body').append('<div id="test"></div>');
    var result = '';
    app.bind('#test', {
      life: { mount: 'mount' },
      mount: function(){
        this.$el.remove();
        this.publish('baz');
        result += 'b';
        assert.equal('b',result);
        done();
      },
      subs: {'baz':'baz'},
      baz: function(ev){
        result += 'a';
      }
    });
  });
});

describe('Controller upward messaging', function(){

  it('should work', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#outer', {
      below: {'x':'foo'},
      foo: function(ev){
        done();
      }
    });
    app.bind('#inner', {
      life: { mount: 'mount' },
      mount: function(){
        this.up('x');
      }
    });
  });

  it('should work synchronously', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    var result = ''
    app.bind('#outer', {
      below: {'x':'foo'},
      foo: function(ev){
        result += 'a';
      }
    });
    app.bind('#inner', {
      life: { mount: 'mount' },
      mount: function(){
        this.up('x');
        result += 'b';
        assert.equal('ab', result)
        done()
      }
    });
  });

  it('should work multi', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    var result = '';
    app.bind('#outer', {
      below: {'x':['foo','bar']},
      foo: function(ev){ result += 'a' },
      bar: function(ev){
        result += 'b';
        assert.equal('ab', result)
        done();
      }
    });
    app.bind('#inner', {
      life: { mount: 'mount' },
      mount: function(){
        this.up('x');
      }
    });
  });

  it('should have event type', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#outer', {
      below: {'x':'foo'},
      foo: function(ev){
        assert.equal('x', ev.type);
        done();
      }
    });
    app.bind('#inner', {
      life: { mount: 'mount' },
      mount: function(){
        this.up('x');
      }
    });
  });

  it('should work with this', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#outer', {
      below: {'x':'foo'},
      foo: function(ev){
        assert.ok(this instanceof freeloader.Controller);
        done();
      }
    });
    app.bind('#inner', {
      life: { mount: 'mount' },
      mount: function(){
        this.up('x');
      }
    });
  });

  it('should work with args', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#outer', {
      below: {'x':'foo'},
      foo: function(ev, a1, a2){
        assert.strictEqual(true, a1)
        assert.strictEqual(1, a2)
        done();
      }
    });
    app.bind('#inner', {
      life: { mount: 'mount' },
      mount: function(){
        this.up('x', true, 1);
      }
    });
  });

  it('should only work up', function(done){
    $('body').append('<div id="outer"><div id="inner"></div><div id="sibling"></div></div>');
    app.bind('#sibling', {
      below: {'x':'foo'},
      foo: function(ev){
        done(new Error('should not be called'));
      }
    });
    app.bind('#inner', {
      life: { mount: 'mount' },
      mount: function(){
        this.up('x');
        done();
      }
    });
  });
});

describe('Controller downward messaging', function(){

  it('should work', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#inner', {
      above: {'x':'foo'},
      foo: function(ev){
        done();
      }
    });
    app.bind('#outer', {
      life: { mount: 'mount' },
      mount: function(){
        this.down('x');
      }
    });
  });

  it('should work synchronously', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    var result = ''
    app.bind('#inner', {
      above: {'x':'foo'},
      foo: function(ev){
        result += 'a';
      }
    });
    app.bind('#outer', {
      life: { mount: 'mount' },
      mount: function(){
        this.down('x');
        result += 'b';
        assert.equal('ab', result)
        done()
      }
    });
  });

  it('should work multi', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    var result = '';
    app.bind('#inner', {
      above: {'x':['foo','bar']},
      foo: function(ev){ result += 'a' },
      bar: function(ev){
        result += 'b';
        assert.equal('ab', result)
        done();
      }
    });
    app.bind('#outer', {
      life: { mount: 'mount' },
      mount: function(){
        this.down('x');
      }
    });
  });

  it('should have event type', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#inner', {
      above: {'x':'foo'},
      foo: function(ev){
        assert.equal('x', ev.type);
        done();
      }
    });
    app.bind('#outer', {
      life: { mount: 'mount' },
      mount: function(){
        this.down('x');
      }
    });
  });

  it('should work with this', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#inner', {
      above: {'x':'foo'},
      foo: function(ev){
        assert.ok(this instanceof freeloader.Controller);
        done();
      }
    });
    app.bind('#outer', {
      life: { mount: 'mount' },
      mount: function(){
        this.down('x');
      }
    });
  });

  it('should work with args', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div>');
    app.bind('#inner', {
      above: {'x':'foo'},
      foo: function(ev, a1, a2){
        assert.strictEqual(true, a1)
        assert.strictEqual(1, a2)
        done();
      }
    });
    app.bind('#outer', {
      life: { mount: 'mount' },
      mount: function(){
        this.down('x', true, 1);
      }
    });
  });

  it('should only work down', function(done){
    $('body').append('<div id="outer"><div id="inner"></div></div><div id="sibling"></div>');
    app.bind('#sibling', {
      above: {'x':'foo'},
      foo: function(ev){
        done(new Error('should not be called'));
      }
    });
    app.bind('#outer', {
      life: { mount: 'mount' },
      mount: function(){
        this.down('x');
        done();
      }
    });
  });
});

describe.skip('Injection', function(){
  it('should inject replace', function(done){
    app.bind('.inject-test-1-updated', {
      life: { mount: 'mount' },
      mount: function(){
        done();
      }
    });
    app.bind(cr('#inject-test-1'), {
      life: { mount: 'mount' },
      mount: function(){
        this.inject({
          html: '<div class="inject-test-1-updated"></div>',
          replace: true
        }, function(err){
          if (err) done(err);
          assert.strictEqual($('.inject-test-1-updated').length, 1);
        });
      }
    });
  });
  it('should inject into', function(done){
    app.bind('#inject-test-2-updated', {
      life: { mount: 'mount' },
      mount: function(){
        done();
      }
    });
    app.bind(cr('#inject-test-2'), {
      life: { mount: 'mount' },
      mount: function(){
        this.inject({
          html:'<div id="inject-test-2-updated"></div>',
          into: true
        }, function(err){
          if (err) done(err);
          assert.ok(this.$('div').length === 1);
        });
      }
    });
  });
  it('should inject append', function(done){
    app.bind(cr('#inject-test-3'), {
      life: { mount: 'mount' },
      mount: function(){
        this.inject({
          html: '<p data-idx="0"></p>',
          append: true
        }, function(err){
          assert.ok(this.$('p').length === 1);
          done(err);
        });
      }
    });
  });
  it('should inject prepend', function(done){
    app.bind(cr('#inject-test-3'), {
      life: { mount: 'mount' },
      mount: function(){
        this.inject({
          html: '<p data-idx="0"></p>',
          prepend: true
        }, function(err){
          assert.ok(this.$('p').length === 1);
          done(err);
        });
      }
    });
  });
  it('should inject into sub element', function(done){
    app.bind(cr('#inject-test-5'), {
      life: { mount: 'mount' },
      mount: function(){
        this.$el.html('<div></div>');
        this.inject({
          html:'<div></div>',
          into: 'div'
        });
        assert.ok(this.$('div div').length === 1);
        done();
      }
    });
  });
  it('should inject append selector', function(done){
    app.bind(cr('#inject-test-6'), {
      life: { mount: 'mount' },
      mount: function(){
        this.$el.html('<ul></ul>');
        this.inject({
          html: '<li data-idx="0"></li>',
          append: 'ul'
        });
        this.inject({
          html: '<li data-idx="1"></li>',
          append: 'ul'
        });
        this.inject({
          html: '<li data-idx="2"></li>',
          append: 'ul'
        });
        assert.ok(this.$('ul li').length === 3);
        this.$('ul li').each(function(idx){
          assert.ok(this.getAttribute('data-idx') == idx);
        });
        done();
      }
    });
  });
  it('should inject prepend selector', function(done){
    app.bind(cr('#inject-test-7'), {
      life: { mount: 'mount' },
      mount: function(){
        this.$el.html('<ul></ul>');
        this.inject({
          html: '<li data-idx="0"></li>',
          prepend: 'ul'
        });
        this.inject({
          html: '<li data-idx="1"></li>',
          prepend: 'ul'
        });
        this.inject({
          html: '<li data-idx="2"></li>',
          prepend: 'ul'
        });
        assert.ok(this.$('ul li').length === 3);
        this.$('ul li').each(function(idx){
          assert.ok(this.getAttribute('data-idx') == (2-idx));
        });
        done();
      }
    });
  });
  it('should inject before', function(done){
    app.bind(cr('#inject-test-8'), {
      life: { mount: 'mount' },
      mount: function(){
        this.$el.html('<p></p>');
        this.inject({
          html: '<span></span>',
          before: 'p'
        });
        this.inject({
          html: '<em></em>',
          before: 'p'
        });
        var els = this.$('p,span,em');
        assert.ok(els.length === 3);
        els.each(function(idx){
          if (idx === 0) assert.ok($(this).is('span'));
          if (idx === 1) assert.ok($(this).is('em'));
          if (idx === 2) assert.ok($(this).is('p'));
        });
        done();
      }
    });
  });
  it('should inject after', function(done){
    app.bind(cr('#inject-test-9'), {
      life: { mount: 'mount' },
      mount: function(){
        this.$el.html('<p></p>');
        this.inject({
          html: '<span></span>',
          after: 'p'
        });
        this.inject({
          html: '<em></em>',
          after: 'p'
        });
        var els = this.$('p,span,em');
        assert.ok(els.length === 3);
        els.each(function(idx){
          if (idx === 0) assert.ok($(this).is('p'));
          if (idx === 1) assert.ok($(this).is('em'));
          if (idx === 2) assert.ok($(this).is('span'));
        });
        done();
      }
    });
  });
  it('should inject from url', function(done){
    var worked = false;
    app.bind('#injectme-test', {
      life: { mount: 'mount' },
      mount: function(){
        worked = true;
      }
    });
    app.bind(cr('#inject-test-10'), {
      life: { mount: 'mount' },
      mount: function(){
        this.inject({
          url: '/injectme.html'
        }, function(err){
          assert.ok(this.$('#injectme-test').length === 1);
          assert.ok(worked, 'did not mount controller');
          done();
        }, this);
      }
    });
  });
  it('should inject from url with selector', function(done){
    var worked = false;
    app.bind('#injectme-test-2', {
      life: { mount: 'mount' },
      mount: function(){
        worked = true;
      }
    });
    app.bind(cr('#inject-test-11'), {
      life: { mount: 'mount' },
      mount: function(){
        this.inject({
          url: '/injectme2.html #injectme-test-2'
        }, function(err){
          assert.ok(this.$('#injectme-test-2').length === 1);
          assert.ok(worked, 'did not mount controller');
          done();
        }, this);
      }
    });
  });
  it('should inject from url with error', function(done){
    app.bind(cr('#inject-test-12'), {
      life: { mount: 'mount' },
      mount: function(){
        this.inject({
          url: '/does-not-exist.html #injectme-test-2'
        }, function(err){
          assert.ok(err);
          done();
        });
      }
    });
  });
});

describe.skip('Content loading', function(){
  it('should load', function(done){
    app._load('/loadme.html', function(err, doc, xhr){
      assert.ok(doc.title === 'Test 1','wrong title');
      assert.ok(xhr.status === 200, 'wrong status');
      done();
    });
  });
  it('should handle error', function(done){
    app._load('/missing.html', function(err, doc, xhr){
      assert.ok(!err, 'unexpected error');
      assert.ok(xhr.status === 404, 'wrong status');
      done();
    });
  });
});

describe.skip('Navigation', function(){
  it('should navigate', function(done){
    app.navigate('/navigate.html', function(err){
      assert.ok(window.document.title === 'title foo', 'wrong title');
      assert.ok(window.document.body.id === 'x', 'wrong body id');
      var $h1 = $('h1');
      assert.ok($h1.length === 1, 'unexpected dom structure');
      assert.ok($h1.text() === 'Test 1', 'unexpected content');
      done(err);
    });
  });
  it('should execute a script', function(done){
    app.navigate('/navigate2.html', function(err){
      assert.ok(window.document.title === 'title foo2', 'wrong title');
      assert.ok(window.document.body.id === 'y', 'wrong body id');
      assert.ok(window.navigate2 === 1);
      done(err);
    });
  });
  it('should not execute a script twice', function(done){
    app.navigate('/navigate2.html', function(err){
      assert.ok(window.document.title === 'title foo2', 'wrong title');
      assert.ok(window.document.body.id === 'y', 'wrong body id');
      assert.ok(window.navigate2 === 1);
      done(err);
    });
  });
});
