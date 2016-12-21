// Partially apply arguments to a function
exports.partial = function(fn /*, args */) {
  let initialArgs = Array.prototype.slice.call(arguments, 1);
  return function(/* args */) {
    let restOfArgs = Array.prototype.slice.call(arguments);
    return fn.apply(null, initialArgs.concat(restOfArgs));
  };
};
