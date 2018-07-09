// Generated by CoffeeScript 2.3.1

/*eslint no-console: 0*/
var M, None, allAwait, allPromise, apply, bindObject, concatArr, deadline, delay, expandApply, firstElement, flatArray, flatObject, genLog, getIterator, identity, invokeAsync, invokePromises, isFunction, isGenerator, isGeneratorFunction, isIterable, isMultiIterable, isObject, isSymmetry, isType, iter, logError, logInfo, logLevel, makeFrame, mapArr, mapList, pall, pushMap, raceAwait, racePromise, retry, sequence, tco, zipApplyArr;

identity = (x) => {
  return x;
};

None = () => {
  return void 0;
};

isType = (type) => {
  return (x) => {
    return typeof x === type;
  };
};

isObject = isType('object');

isFunction = isType('function');

concatArr = (arr, cur) => {
  return arr.concat(Array.isArray(cur) ? cur : [cur]);
};

flatArray = (arr = []) => {
  return arr.reduce(concatArr, []);
};

flatObject = (o) => {
  var key, res;
  res = {};
  for (key in o) {
    if ((o[key] != null) && o.hasOwnProperty(key)) {
      if ((isObject(o[key])) && (!Array.isArray(o[key]))) {
        Object.assign(res, flatObject(o[key]));
      } else if (res[key] == null) {
        res[key] = o[key];
      }
    }
  }
  return res;
};

// Synchronous function only
isSymmetry = (f) => {
  if (!isFunction(f)) {
    throw new TypeError('Parameter is not a Function');
  }
  return (...args) => {
    var l, r;
    l = f(...args);
    r = f(...args.reverse());
    return l === r;
  };
};

isIterable = (x) => {
  return isObject(x) && x[Symbol.iterator];
};

getIterator = (x) => {
  return x[Symbol.iterator]();
};

isMultiIterable = (x) => {
  return isIterable(x) && !isSymmetry(getIterator)(x);
};

iter = (function*() {
  return (yield);
}).prototype.constructor;

isGenerator = (g) => {
  return g && g.constructor === iter;
};

isGeneratorFunction = (g) => {
  return g && g[Symbol.toStringTag] === 'GeneratorFunction';
};

mapList = (func) => {
  return function*(list) {
    var item, results, x;
    results = [];
    for (item of list) {
      x = func(list);
      if (isIterable(x)) {
        results.push((yield) * x);
      } else {
        results.push((yield x));
      }
    }
    return results;
  };
};

tco = (f) => {
  if (!isGeneratorFunction(f)) {
    throw new TypeError('Parameter is not a GeneratorFunction');
  }
  return (...args) => {
    var done, i, res, value;
    i = f(...args);
    while (true) {
      ({value, done} = i.next());
      if (isGenerator(value)) {
        i = value;
      } else if (done) {
        break;
      } else {
        res = value;
      }
    }
    return res;
  };
};

// M constructs a Monad wrapping a deferred function using Promise
// M(f) is lazy and reinvokable just like a plain function
// with .then and .catch methods like a Promise
// Monad Laws:
// f: a -> M b
// g: b -> M c
// unit(a).then f = f a
// unit unit x = unit x
// m.then(f).then(g) = m.then a -> f(a).then g
M = (() => {
  var handler, reject;
  // though this interface looks like Promise, but Promise isn't reinvokable,
  // so we do not accept a Promise here
  handler = function(onFulfilled, onRejected) {
    if (onFulfilled && !isFunction(onFulfilled)) {
      throw new TypeError("Parameter onFulfilled isn't a Function");
    }
    if (onRejected && !isFunction(onRejected)) {
      throw new TypeError("Parameter onRejected isn't a Function");
    }
    if (onFulfilled || onRejected) {
      return M((...args) => {
        return this(...args).then(onFulfilled, onRejected);
      });
    } else {
      throw new TypeError('Neither onFulfilled nor onRejected is a Function');
    }
  };
  reject = function(onRejected) {
    return this.then(null, onRejected);
  };
  return (f) => {
    var _t, r;
    if (!isFunction(f)) {
      _t = f;
      f = () => {
        return _t;
      };
    }
    if (isFunction(f.then) && isFunction(f.catch)) {
      return f;
    }
    r = async function(...args) {
      return (await f(...args));
    };
    return Object.assign(r, {
      // since M(f) is just a function and
      // Promise.prototype.then will lift function to Promise, binding Promise as well.
      // we use .then alias for both .map and .bind in a typical Monad
      then: handler.bind(r),
      catch: reject.bind(r)
    });
  };
})();

bindObject = (o, name) => {
  return o[name].bind(o);
};

allPromise = bindObject(Promise, 'all');

racePromise = bindObject(Promise, 'race');

invokeAsync = (func) => {
  return async function(...args) {
    return (await func(...args));
  };
};

expandApply = (func) => {
  return (arr = []) => {
    return func(...arr);
  };
};

mapArr = (func) => {
  return (arr) => {
    return arr.map(func);
  };
};

zipApplyArr = (a1) => {
  return (a2 = []) => {
    return a1.map((f, i) => {
      return f(a2[i]);
    });
  };
};

invokePromises = (predicate) => {
  return (funcs) => {
    var fz, g;
    if (!Array.isArray(funcs)) {
      throw new TypeError('Functions is not an Array');
    }
    if (!(funcs != null ? funcs.length : void 0)) {
      throw new TypeError('Functions is empty');
    }
    if (!funcs.every(isFunction)) {
      throw new TypeError('Some handler is not a Function');
    }
    g = (f) => {
      return expandApply(invokeAsync(f));
    };
    fz = zipApplyArr(mapArr(g)(funcs));
    return (arr) => {
      return predicate(fz(arr));
    };
  };
};

allAwait = invokePromises(allPromise);

raceAwait = invokePromises(racePromise);

apply = (func) => {
  var f;
  f = expandApply(invokeAsync(func));
  return (mapFunc) => {
    return mapFunc(f);
  };
};

makeFrame = (keys = []) => {
  return (values) => {
    var o;
    if (!Array.isArray(values)) {
      return;
    }
    o = {};
    keys.forEach((key, i) => {
      if (values[i] !== void 0) {
        return o[key] = values[i];
      }
    });
    return o;
  };
};

firstElement = (iterable = []) => {
  return iterable[Symbol.iterator]().next().value;
};

sequence = (f, memory = true) => {
  if (memory) {
    return async(iterable = []) => {
      var i, res, results;
      results = [];
      for (i of iterable) {
        res = (await f(i));
        if (res != null) {
          results.push(res);
        } else {
          break;
        }
      }
      return results;
    };
  } else {
    return async(iterable = []) => {
      var i;
      for (i of iterable) {
        if (((await f(i))) == null) {
          break;
        }
      }
    };
  }
};

pall = (fn) => {
  if (!isFunction(fn)) {
    throw new TypeError('Parameter is not a Function');
  }
  return (items = []) => {
    return allPromise(mapArr(fn)(items));
  };
};

pushMap = (map) => {
  if (!map instanceof Map) {
    throw new TypeError('Parameter is not a Map');
  }
  return (item) => {
    return (key) => {
      var c;
      c = map.get(key);
      if (c == null) {
        c = [];
      }
      c.push(item);
      return map.set(key, c);
    };
  };
};

// Let setTimeout converts timeout parameter, no check here
delay = (timeout) => {
  return () => {
    return new Promise((resolve) => {
      return setTimeout((() => {
        return resolve(timeout);
      }), timeout);
    });
  };
};

deadline = (timeout) => {
  return () => {
    var reason;
    reason = new Error(timeout);
    return new Promise((resolve, reject) => {
      return setTimeout((() => {
        return reject(reason);
      }), timeout);
    });
  };
};

retry = (f) => {
  var noTry;
  if (!isFunction(f)) {
    throw new TypeError('Parameter is not a Function');
  }
  noTry = new Error('try count is 0');
  return (count = 1) => {
    count = +count;
    if (!(count >= 0)) {
      throw new Error('Retry count is negative or NaN');
    }
    return (...args) => {
      var c, g;
      c = count;
      return (g = (e) => {
        if (c--) {
          return Promise.resolve().then(() => {
            return f(...args);
          }).catch(g);
        } else {
          return Promise.reject(e);
        }
      })(noTry);
    };
  };
};

logLevel = 2;

genLog = ((logLevel) => {
  return (level) => {
    return (func) => {
      if (logLevel > level) {
        return func;
      } else {
        return None;
      }
    };
  };
})(logLevel);

logInfo = genLog(1)(bindObject(console, 'log'));

logError = genLog(-1)(bindObject(console, 'error'));

module.exports = {identity, None, M, concatArr, flatArray, flatObject, invokeAsync, allAwait, raceAwait, delay, deadline, retry, pall, makeFrame, firstElement, sequence, pushMap, isFunction, isGenerator, tco, logInfo, logError, genLog};

//# sourceMappingURL=common.js.map
