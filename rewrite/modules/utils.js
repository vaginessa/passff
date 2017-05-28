PassFF.Utils = {
  isUndefined: function(value) {
    return (typeof value === 'undefined');
  },

  each: function(collection, func) {
    let isArrayLike = (typeof collection.length !== 'undefined');
    var i, length;
    if (isArrayLike) {
      for (i=0, length=collection.length; i < length; i++) {
        func(collection[i], i, collection);
      }
    } else {
      let keys = Object.keys(collection);
      for (i=0, length=keys.length; i < length; i++) {
        func(collection[keys[i]], keys[i], collection);
      }
    }
    return collection;
  }
};
