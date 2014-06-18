/* ---------------------------------------------------
 * @copyright (c) Greg Reimer https://github.com/greim
 * This source code is licensed under the MIT License
 * http://opensource.org/licenses/MIT
 */

var $ = require('jquery');
var await = require('await');
var parse = require('./document-parser');

var currentXhrProm = {fail:function(){}},
  currentXhr = {abort:function(){}},
  loadedScripts = {},
  loadedStyleSheets = {};

$('script[src]').each(function(){
  var url = this.getAttribute('src');
  loadedScripts[url] = true;
});
$('link[rel="stylesheet"][href]').each(function(){
  var url = this.getAttribute('href');
  loadedStyleSheets[url] = true;
});

module.exports = {

  getDocument: function(url){

    currentXhrProm.fail(false);
    currentXhr.abort();

    var documentProm = await('document');

    var xhrProm = currentXhrProm = await('xhr')
    .run(function(pr){
      var xhr = currentXhr = $.ajax(url, {
        type: 'GET',
        dataType: 'html',
        success: function(){
          pr.keep('xhr', xhr)
        },
        error: function(){
          if (!xhr.status){
            pr.fail(new Error('failed request'));
          } else {
            pr.keep('xhr', xhr);
          }
        }
      });
    })
    .onfail(function(err){
      if (err){
        documentProm.fail(err);
      }
    })
    .onkeep(function(got){
      var xhr = got.xhr;
      try {
        var doc = parse(xhr.responseText);
        documentProm.keep('document', doc);
      } catch(ex) {
        documentProm.fail(ex);
      }
    });

    return documentProm;
  },

  loadScripts: function(doc){
    return await('scripts').run(function(pr){
      var scripts = $(doc).find('script[src]').remove().toArray();
      var unloaded = scripts.filter(function(script){
        var url = script.getAttribute('src');
        if (!loadedScripts[url]){
          loadedScripts[url] = true;
          return true;
        } else {
          return false;
        }
      });
      if (unloaded.length === 0) {
        return pr.keep('scripts');
      }
      var all = unloaded.map(function(script){
        var url = script.getAttribute('src');
        return await('script')
        .run(function(pr){
          $.getScript(url)
          .then(function(){
            pr.keep('script');
          }, function(err){
            pr.fail(err);
          });
        });
      });
      await.all(all)
      .onfail(pr.fail, pr)
      .onkeep(function(){
        pr.keep('scripts');
      });
    }, this);
  },

  loadCss: function(doc){
    return await('css').run(function(pr){
      var css = $(doc).find('link[rel="stylesheet"][href]').remove().toArray();
      var unloaded = css.filter(function(link){
        var url = link.getAttribute('href');
        if (!loadedStyleSheets[url]){
          loadedStyleSheets[url] = true;
          return true;
        } else {
          return false;
        }
      });
      if (unloaded.length === 0) {
        return pr.keep('css');
      }
      var all = unloaded.map(function(link){
        $(link).appendTo('head');
        return await('link').keep('link'); // no-op promise for now
      });
      await.all(all)
      .onfail(pr.fail, pr)
      .onkeep(function(){
        pr.keep('css');
      });
    }, this);
  },

  loadPage: function(opts, cb, ctx){
    if (typeof opts === 'string'){
      opts = { url: opts };
    }
    await('document', 'scripts', 'css')
    .run(function(pr){
      var docProm = this.getDocument(opts.url);
      pr.take(docProm);
      docProm.onkeep(function(got){
        pr.take(this.loadScripts(got.document));
        pr.take(this.loadCss(got.document));
      }, this);
    }, this)
    .onfail(function(err){
      cb.call(ctx, err);
    })
    .onkeep(function(got){
      var newDoc = got.document;
      var oldDoc = document;
      oldDoc.title = newDoc.title;
      var newBody = newDoc.body;
      newBody.parentNode.removeChild(newBody);
      var oldBody = oldDoc.body;
      oldBody.parentNode.removeChild(oldBody);
      oldDoc.documentElement.appendChild(newBody);
      $('[autofocus]').eq(0).focus();
      if (!opts.noScrollToTop) window.scrollTo(0,0);
      cb.call(ctx, null);
    });
  }
};
