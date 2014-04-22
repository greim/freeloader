var freeloader = require('../freeloader');
var $ = require('jquery-browserify');

var app = freeloader();

function assert(thing, message){
  if (!thing) throw new Error(message || 'failed assertion');
}

describe('Controller', function(){

  it('should init without error', function(done){
    app.bind('#test1', {
      init: function(){
        done();
      }
    });
  });

  it('should init without error on dupe elements', function(done){
    app.bind('#test1', {
      init: function(){
        done();
      }
    });
  });

  it('should init without error, using extend', function(done){
    app.bind('#test2', freeloader.Controller.extend({
      init: function(){
        done();
      }
    }));
  });

  it('should have correct this', function(done){
    var MyController = freeloader.Controller.extend({
      init: function(){
        if (this instanceof MyController){
          done();
        } else {
          done(new Error('wrong context'));
        }
      }
    });
    app.bind('#test2', MyController);
  });

  it('should have an el property', function(done){
    app.bind('#test3', {
      init: function(){
        if (!this.el){
          done(new Error('no el property'));
        } else if (!this.el.nodeType) {
          done(new Error('no nodeType on el property'));
        } else if (this.el.nodeType !== 1) {
          done(new Error('el property is not an element'));
        } else if (!$.contains(document.documentElement, this.el)) {
          done(new Error('el property is not contained by document'));
        } else {
          done();
        }
      }
    });
  });

  it('should have an $el property', function(done){
    app.bind('#test3', {
      init: function(){
        if (!this.$el){
          done(new Error('no $el property'));
        } else if (!(this.$el instanceof $)) {
          done(new Error('$el is not a jQuery instance'));
        } else {
          done();
        }
      }
    });
  });

  it('should have a working $el property', function(done){
    app.bind('#test3', {
      init: function(){
        if (this.$el.length !== 1){
          done(new Error('$el contains wrong number of things'));
        } else {
          done();
        }
      }
    });
  });

  it('should have a $ property', function(done){
    app.bind('#test3', {
      init: function(){
        if (!this.$){
          done(new Error('no $ property'));
        } else if (typeof this.$ !== 'function') {
          done(new Error('$ is not a function'));
        } else {
          done();
        }
      }
    });
  });

  it('should have a working $ property', function(done){
    app.bind('#test3', {
      init: function(){
        var $a = this.$('a[href]');
        if ($a.length !== 1){
          done(new Error("$ property didn't work"));
        } else {
          done();
        }
      }
    });
  });
});

describe('Controller DOM events', function(){

  it('should accept empty event objects without error', function(done){
    app.bind('#test1', {
      events: {},
      init: function(){
        done();
      }
    });
  });

  it('should accept non-empty event objects without error', function(done){
    app.bind('#test1', {
      events: {'click a[href]':'handleClick'},
      init: function(){
        done();
      }
    });
  });

  it('should handle a direct DOM event', function(done){
    app.bind('#test3', {
      events: {'click':'handleClick'},
      init: function(){
        this.$el.trigger('click');
      },
      handleClick: function(){
        done();
      }
    });
  });

  it('should handle a delegated DOM event', function(done){
    app.bind('#test3', {
      events: {'click a[href]':'handleClick'},
      init: function(){
        this.$('a[href]').trigger('click');
      },
      handleClick: function(){
        done();
      }
    });
  });

  it('should have correct params in DOM handler', function(done){
    app.bind('#test3', {
      events: {'click a[href]':'handleClick'},
      init: function(){
        this.self = this;
        this.$('a[href]').trigger('click');
      },
      handleClick: function(ev){
        try {
          ev.preventDefault();
          this.self.self;
        } catch(err) {
          done(err);
        }
        done();
      }
    });
  });
});

describe('Controller subscriptions', function(){

  it('should accept empty subs objects without error', function(done){
    app.bind('#test1', {
      subs: {},
      init: function(){
        done();
      }
    });
  });

  it('should accept non-empty subs objects without error', function(done){
    app.bind('#test1', {
      subs: {'foo':'foo'},
      init: function(){
        done();
      }
    });
  });

  it('should work globally', function(done){
    app.bind('#test1', {
      subs: {'baz':'baz'},
      init: function(){
        app.publish('baz');
      },
      baz: function(){
        done();
      }
    });
  });

  it('should work globally, with arguments', function(done){
    app.bind('#test1', {
      subs: {'baz1':'baz1'},
      init: function(){
        app.publish('baz1','a',0);
      },
      baz1: function(ev, arg1, arg2){
        assert(ev, 'no event arg');
        assert(!ev.source, "event shouldn't have source");
        assert(ev.type === 'baz1', 'event type was wrong');
        assert(arg1 === 'a', 'arg1 was wrong');
        assert(arg2 === 0, 'arg2 was wrong');
        done();
      }
    });
  });

  it('should work locally', function(done){
    app.bind('#test1', {
      subs: {'baz2':'baz2'},
      init: function(){
        this.publish('baz2');
      },
      baz2: function(){
        done();
      }
    });
  });

  it('should work locally, with arguments', function(done){
    app.bind('#test1', {
      subs: {'baz3':'baz3'},
      init: function(){
        this.publish('baz3','a',0);
      },
      baz3: function(ev, arg1, arg2){
        assert(ev, 'no event arg');
        assert(ev.source === this, "event had wrong source");
        assert(ev.type === 'baz3', 'event type was wrong');
        assert(arg1 === 'a', 'arg1 was wrong');
        assert(arg2 === 0, 'arg2 was wrong');
        done();
      }
    });
  });
});
