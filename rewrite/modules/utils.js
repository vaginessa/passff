PassFF.Utils = (function() {
  let isArrayLike = function(value) {
    return typeof value.length !== 'undefined';
  };

  let each = function(collection, func) {
    var i, length;
    if (isArrayLike(collection)) {
      for (i=0, length=collection.length; i < length; i++) {
        func(collection[i], i, collection);
      }
    } else {
      let keys = Object.keys(collection);
      for (i=0, length=keys.length; i < length; i++) {
        func(collection[keys[i]], keys[i]);
      }
    }
    return collection;
  };

  var _ = {
    isUndefined: function(value) {
      return (typeof value === 'undefined');
    },

    isBlank: function(value) {
      return _.isUndefined(value) ||
        (typeof value === 'string' && /^\s*$/.test(value));
    },

    isEmpty: function(collection) {
      return Object.keys(collection).length === 0;
    },

    complement: function(func) {
      return function(/* arguments */) {
        return !func(...arguments);
      };
    },

    property: function(propertyName) {
      return function(obj) {
        return obj[propertyName];
      };
    },

    each: each,

    map: function(collection, func) {
      let result;
      if (isArrayLike(collection)) {
        result = [];
        _.each(collection, function(item, i) {
          result.push(func(item, i));
        });
      } else {
        result = {};
        _.each(collection, function(val, key) {
          result[key] = func(val, key);
        });
      }
      return result;
    },

    select: function(collection, func) {
      let result;
      if (isArrayLike(collection)) {
        result = [];
        _.each(collection, function(item, i) {
          if (func(item, i)) result.push(item);
        });
      } else {
        result = {};
        _.each(collection, function(val, key) {
          if (func(val, key)) result[key] = val;
        });
      }
      return result;
    },

    reject: function(collection, func) {
      return _.select(collection, _.complement(func));
    },

    findMapped: function(collection, func) {
      var i, length, result;
      if (isArrayLike(collection)) {
        for (i=0, length=collection.length; i < length; i++) {
          result = func(collection[i], i, collection);
          if (result) return result;
        }
      } else {
        let keys = Object.keys(collection);
        for (i=0, length=keys.length; i < length; i++) {
          result = func(collection[keys[i]], keys[i]);
          if (result) return result;
        }
      }
      return result;
    },
  };

  return _;
})();
