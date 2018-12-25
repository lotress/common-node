// Generated by CoffeeScript 2.3.2

/*eslint no-console: 0*/
var BinaryHeap, M, MinCapacity, None, allAwait, allPromise, apply, bindObject, concatArr, deadline, defaultHeapOptions, delay, expandApply, firstElement, flatArray, flatObject, genLog, genWrap, getCapacity, getIterator, identity, invokeAsync, invokePromises, isFunction, isGenerator, isGeneratorFunction, isIterable, isMultiIterable, isObject, isSymmetry, isType, iterConstructor, logError, logInfo, logLevel, makeFrame, mapArr, mapList, newMessageQueue, newPool, pall, pushMap, raceAwait, racePromise, retry, sequence, tco, zipApplyArr;

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
    throw new TypeError('Argument is not a Function');
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

iterConstructor = (function*() {
  return (yield);
}).prototype.constructor;

isGenerator = (g) => {
  return g && g.constructor === iterConstructor;
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
    throw new TypeError('Argument is not a GeneratorFunction');
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
      var iter, res, results, t;
      iter = iterable[Symbol.iterator]();
      results = [];
      while (!(t = iter.next(res)).done) {
        res = (await f(t.value));
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
      var iter, res, t;
      iter = iterable[Symbol.iterator]();
      while (!(t = iter.next(res)).done) {
        res = (await f(t.value));
        if (res == null) {
          break;
        }
      }
    };
  }
};

pall = (fn) => {
  if (!isFunction(fn)) {
    throw new TypeError('Argument is not a Function');
  }
  return (items = []) => {
    return allPromise(mapArr(fn)(items));
  };
};

pushMap = (map) => {
  if (!map instanceof Map) {
    throw new TypeError('Argument is not a Map');
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
  return (result) => {
    return new Promise((resolve) => {
      return setTimeout((() => {
        return resolve(result === void 0 ? timeout : result);
      }), timeout);
    });
  };
};

deadline = (timeout) => {
  return (reason) => {
    if (reason == null) {
      reason = new Error(timeout);
    }
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
    throw new TypeError('Argument is not a Function');
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

genWrap = (Class) => {
  if (!(Class && Class.prototype && isFunction(Class))) {
    throw new TypeError('Argument is not a Class');
  }
  return (obj, ...rest) => {
    if (obj instanceof Class) {
      return obj;
    } else {
      return new Class(obj, ...rest);
    }
  };
};

MinCapacity = 128;

getCapacity = (length) => {
  if (length < MinCapacity) {
    return MinCapacity;
  } else {
    return 1 << 32 - Math.clz32(length);
  }
};

defaultHeapOptions = {
  Type: Float64Array,
  simple: false
};

BinaryHeap = function(options = defaultHeapOptions) {
  var Type, assign, capacity, data, heap, insert, keys, length, newCapacity, peek, pop, push, removeMin, simple, up;
  ({Type, simple} = Object.assign({}, defaultHeapOptions, options));
  data = [null];
  capacity = MinCapacity;
  length = 0;
  keys = {
    length: 0
  };
  (newCapacity = () => {
    var arr;
    capacity = getCapacity(length);
    if (capacity === keys.length) {
      return;
    } else if (capacity > keys.length) {
      arr = new Type(new ArrayBuffer(capacity * Type.BYTES_PER_ELEMENT));
      if (keys) {
        arr.set(keys);
      }
    } else {
      arr = new Type(keys.buffer, 0, capacity);
    }
    return keys = arr;
  })();
  assign = simple ? (i, j) => {
    keys[i] = keys[j];
  } : (i, j) => {
    keys[i] = keys[j];
    data[i] = data[j];
  };
  up = (i) => {
    var j, k;
    k = keys[length];
    j = i >> 1;
    while (j && keys[j] > k) {
      assign(i, j);
      i = j;
      j = j >> 1;
    }
    keys[i] = k;
    return i;
  };
  insert = simple ? None : (value, i) => {
    return data[i] = value;
  };
  push = (key, value) => {
    length += 1;
    if (length >= capacity) {
      newCapacity();
    }
    keys[length] = key;
    insert(value, up(length));
    return heap;
  };
  removeMin = (v) => {
    var i, j, k, t;
    k = keys[1];
    i = 1;
    j = 2;
    while (j < length) {
      t = keys[j] > keys[j + 1] ? 1 : 0;
      j += t;
      assign(i, j);
      i = j;
      j = i << 1;
    }
    if (i < length) {
      insert(v, up(i));
    }
    length -= 1;
    if (length < capacity / 2) {
      newCapacity();
    }
    return k;
  };
  pop = simple ? () => {
    if (length < 1) {
      return void 0;
    }
    return removeMin();
  } : () => {
    var res;
    if (length < 1) {
      return void 0;
    }
    res = [keys[1], data[1]];
    removeMin(data[length]);
    data.pop();
    return res;
  };
  peek = simple ? () => {
    if (length < 1) {
      return void 0;
    } else {
      return keys[1];
    }
  } : () => {
    if (length < 1) {
      return void 0;
    } else {
      return [keys[1], data[1]];
    }
  };
  return heap = {push, pop, peek};
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

newMessageQueue = (lengthBits, items, c, l, length, mod) => {
  var len, m;
  l = 0;
  for (m = 0, len = items.length; m < len; m++) {
    c = items[m];
    (c ? l++ : void 0);
  }
  c = items != null ? items.length : void 0;
  if (c == null) {
    c = 0;
  }
  length = 1 << lengthBits;
  mod = length - 1;
  if (items == null) {
    items = [];
  }
  items.length = length;
  return [
    () => {
      if (l >= length) {
        throw new Error('Full');
      }
      while (items[c & mod]) {
        (c = (c + 1) | 0);
      }
      l += 1;
      return items[c & mod] = {
        id: c
      };
    },
    (id) => {
      var p,
    res;
      p = id & mod;
      res = items[p];
      if (res) {
        l -= 1;
      }
      items[p] = void 0;
      return res;
    },
    (id) => {
      var p;
      p = id & mod;
      return items[p];
    }
  ];
};

newPool = (pool, timeout, queue, r, newP) => {
  queue = pool.slice();
  r = null;
  newP = timeout != null ? () => {
    return new Promise((resolve, reject) => {
      r = resolve;
      return setTimeout((() => {
        return reject(timeout);
      }), timeout);
    });
  } : () => {
    return new Promise((resolve) => {
      return r = resolve;
    });
  };
  return [
    async function*() {
      var res;
      while (true) {
        while (queue.length) {
          yield queue.pop();
        }
        res = (await newP().catch((e) => {
          return new Error(e);
        }));
        if (res instanceof Error) {
          r = null;
          yield res;
        }
      }
    },
    (w) => {
      queue.push(w);
      if (typeof r === "function") {
        r();
      }
      return r = null;
    }
  ];
};

logInfo = genLog(1)(bindObject(console, 'log'));

logError = genLog(-1)(bindObject(console, 'error'));

module.exports = {identity, None, M, concatArr, flatArray, flatObject, invokeAsync, allAwait, raceAwait, delay, deadline, retry, pall, makeFrame, firstElement, sequence, pushMap, isFunction, isGenerator, tco, BinaryHeap, genWrap, newMessageQueue, newPool, logInfo, logError, genLog};

//# sourceMappingURL=common.js.map
