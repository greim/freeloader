/* ---------------------------------------------------
 * @copyright (c) Greg Reimer https://github.com/greim
 * This source code is licensed under the MIT License
 * http://opensource.org/licenses/MIT
 */

var $ = require('jquery');

module.exports = (function(){
  var lists = {};
  var hasGEBCN = typeof docEl.getElementsByClassName === 'function';
  var hasQSA = typeof docEl.querySelectorAll === 'function';
  if (hasGEBCN) {
    return function(className){
      if (!lists[className]) {
        lists[className] = docEl.getElementsByClassName(className);
      }
      return lists[className];
    };
  } else if (hasQSA) {
    return function(className){
      return docEl.querySelectorAll('.'+className);
    };
  } else {
    return function(className){
      return $('.'+className).toArray();
    };
  }
})();
