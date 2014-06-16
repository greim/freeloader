/* ---------------------------------------------------
 * @copyright (c) Greg Reimer https://github.com/greim
 * This source code is licensed under the MIT License
 * http://opensource.org/licenses/MIT
 */

var _ = require('lodash');

/*
 * Checks whether a given parseDocument function actually works.
 */
function test(parseDocument){
  try {
    var testDoc = parseDocument('<html><body><p>test');
    return testDoc && testDoc.body && testDoc.body.childNodes.length === 1;
  } catch(err) {
    return false;
  }
}

/*
 * Hopefully one of these can create new documents.
 */
var candidates = [

  function DOMParser(html){
    return (new DOMParser()).parseFromString(html, 'text/html');
  },

  function parseFromInnerHTML(html){
    var doc = document.implementation.createHTMLDocument('');
    doc.documentElement.innerHTML = html;
    return doc;
  },

  function parseFromWrite(html){
    var doc = document.implementation.createHTMLDocument('');
    doc.open('replace');
    doc.write(html);
    doc.close();
    return doc;
  },

  function parseFromIframe(html){
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
module.exports = _.find(candidates, function(candidate){
  return test(candidate);
});

