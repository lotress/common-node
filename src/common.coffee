identity = (x) => x
None = => undefined

isType = (type) => (x) => typeof x is type
isObject = isType 'object'
isFunction = isType 'function'

concatArr = (arr, cur) => arr.concat if Array.isArray cur then cur else [cur]

flatArray = (arr = []) => arr.reduce concatArr, []

flatObject = (o) =>
  res = {}
  for key of o when o[key]? and o.hasOwnProperty key
    if (isObject o[key]) and (not Array.isArray o[key])
      Object.assign res, flatObject o[key]
    else if not res[key]? then res[key] = o[key]
  res

# Synchronous function only
isSymmetry = (f) =>
  if not isFunction f
    throw new TypeError 'Argument is not a Function'
  (...args) =>
    l = f ...args
    r = f ...args.reverse()
    l is r

isIterable = (x) => isObject(x) and x[Symbol.iterator]
getIterator = (x) => x[Symbol.iterator]()
isMultiIterable = (x) => isIterable(x) and not isSymmetry(getIterator) x
iter = (-> yield).prototype.constructor
isGenerator = (g) => g and g.constructor is iter
isGeneratorFunction = (g) => g and g[Symbol.toStringTag] is 'GeneratorFunction'

mapList = (func) => (list) ->
  for item from list
    x = func list
    if isIterable x
      yield* x
    else
      yield x

tco = (f) =>
  if not isGeneratorFunction f
    throw new TypeError 'Argument is not a GeneratorFunction'
  (...args) =>
    i = f ...args
    loop
      {value, done} = i.next()
      if isGenerator value
        i = value
      else if done
        break
      else res = value
    res

# M constructs a Monad wrapping a deferred function using Promise
# M(f) is lazy and reinvokable just like a plain function
# with .then and .catch methods like a Promise
# Monad Laws:
# f: a -> M b
# g: b -> M c
# unit(a).then f = f a
# unit unit x = unit x
# m.then(f).then(g) = m.then a -> f(a).then g
M = do =>
  # though this interface looks like Promise, but Promise isn't reinvokable,
  # so we do not accept a Promise here
  handler = (onFulfilled, onRejected) ->
    if onFulfilled and not isFunction onFulfilled
      throw new TypeError "Parameter onFulfilled isn't a Function"
    if onRejected and not isFunction onRejected
      throw new TypeError "Parameter onRejected isn't a Function"
    if onFulfilled or onRejected
      M (...args) => @(...args).then onFulfilled, onRejected
    else
      throw new TypeError 'Neither onFulfilled nor onRejected is a Function'

  reject = (onRejected) -> @then null, onRejected

  (f) =>
    if not isFunction f
      _t = f
      f = => _t
    if isFunction(f.then) and isFunction(f.catch)
      return f
    r = (...args) ->
      await f ...args
    Object.assign r,
      # since M(f) is just a function and
      # Promise.prototype.then will lift function to Promise, binding Promise as well.
      # we use .then alias for both .map and .bind in a typical Monad
      then: handler.bind r
      catch: reject.bind r

bindObject = (o, name) => o[name].bind o

allPromise = bindObject Promise, 'all'
racePromise = bindObject Promise, 'race'

invokeAsync = (func) => (args...) -> await func args...

expandApply = (func) => (arr = []) => func arr...
mapArr = (func) => (arr) => arr.map func
zipApplyArr = (a1) => (a2 = []) => a1.map (f, i) => f a2[i]
invokePromises = (predicate) => (funcs) =>
  if not Array.isArray funcs
    throw new TypeError 'Functions is not an Array'
  if not funcs?.length
    throw new TypeError 'Functions is empty'
  if not funcs.every isFunction
    throw new TypeError 'Some handler is not a Function'
  g = (f) => expandApply invokeAsync f
  fz = zipApplyArr mapArr(g) funcs
  (arr) => predicate fz arr
allAwait = invokePromises allPromise
raceAwait = invokePromises racePromise
apply = (func) =>
  f = expandApply invokeAsync func
  (mapFunc) => mapFunc f

makeFrame = (keys = []) => (values) =>
  if not Array.isArray values
    return
  o = {}
  keys.forEach (key, i) =>
    if values[i] isnt undefined then o[key] = values[i]
  o

firstElement = (iterable = []) => iterable[Symbol.iterator]().next().value

sequence = (f, memory = true) =>
  if memory
    (iterable = []) =>
      for i from iterable
        res = await f i
        if res?
          res
        else
          break
  else
    (iterable = []) =>
      for i from iterable
        if not (await f i)?
          break
      return

pall = (fn) =>
  if not isFunction fn
    throw new TypeError 'Argument is not a Function'
  (items = []) => allPromise mapArr(fn) items

pushMap = (map) =>
  if not map instanceof Map
    throw new TypeError 'Argument is not a Map'
  (item) => (key) =>
    c = map.get key
    c ?= []
    c.push item
    map.set key, c

# Let setTimeout converts timeout parameter, no check here
delay = (timeout) => =>
  new Promise (resolve) =>
    setTimeout (=> resolve(timeout)), timeout

deadline = (timeout) => =>
  reason = new Error timeout
  new Promise (resolve, reject) =>
    setTimeout (=> reject reason), timeout

retry = (f) =>
  if not isFunction f
    throw new TypeError 'Argument is not a Function'
  noTry = new Error 'try count is 0'
  (count = 1) =>
    count = +count
    if not(count >= 0)
      throw new Error 'Retry count is negative or NaN'
    (...args) =>
      c = count
      do g = (e = noTry) =>
        if c--
          Promise.resolve().then => f ...args
          .catch g
        else
          Promise.reject e

genWrap = (Class) =>
  if not (Class and Class.prototype and isFunction Class)
    throw new TypeError 'Argument is not a Class'
  (obj, ...rest) =>
    if obj instanceof Class
      obj
    else new Class obj, ...rest

MinCapacity = 128
getCapacity = (length) =>
  if length < MinCapacity then MinCapacity else 1 << 32 - Math.clz32 length

defaultHeapOptions = {Type: Float64Array, simple: false}

BinaryHeap = (options = defaultHeapOptions) ->
  {Type, simple} = Object.assign {}, defaultHeapOptions, options
  data = [null]
  capacity = MinCapacity
  length = 0
  keys = {length: 0}

  do newCapacity = =>
    capacity = getCapacity length
    if capacity is keys.length then return
    else if capacity > keys.length
      arr = new Type new ArrayBuffer(capacity * Type.BYTES_PER_ELEMENT)
      if keys
        arr.set keys
    else
      arr = new Type keys.buffer, 0, capacity
    keys = arr

  assign = if simple
    (i, j) =>
      keys[i] = keys[j]
      return
  else
    (i, j) =>
      keys[i] = keys[j]
      data[i] = data[j]
      return

  up = (i) =>
    k = keys[length]
    j = i >> 1
    while j and keys[j] > k
      assign i, j
      i = j
      j = j >> 1
    keys[i] = k
    return i

  insert = if simple
    None
  else
    (value, i) => data[i] = value

  push = (key, value) =>
    length += 1
    if length >= capacity
      newCapacity()
    keys[length] = key
    insert value, up length
    heap

  removeMin = (v) =>
    k = keys[1]
    i = 1
    j = 2
    while j < length
      t = if keys[j] > keys[j + 1] then 1 else 0
      j += t
      assign i, j
      i = j
      j = i << 1
    if i < length
      insert v, up i
    length -= 1
    if length < capacity / 2
      newCapacity()
    k

  pop = if simple
    =>
      if length < 1
        return undefined
      removeMin()
  else
    =>
      if length < 1
        return undefined
      res = [keys[1], data[1]]
      removeMin data[length]
      data.pop()
      res

  peek = if simple
    =>
      if length < 1
        undefined
      else keys[1]
  else
    =>
      if length < 1
        undefined
      else [keys[1], data[1]]

  heap = {push, pop, peek}

logLevel = 2

genLog = do (logLevel) => (level) => (func) =>
  if logLevel > level
    func
  else
    None

###eslint no-console: 0###
logInfo = genLog(1) bindObject console, 'log'

logError = genLog(-1) bindObject console, 'error'

module.exports = {
  identity,
  None,
  M,
  concatArr,
  flatArray,
  flatObject,
  invokeAsync,
  allAwait,
  raceAwait,
  delay,
  deadline,
  retry,
  pall,
  makeFrame,
  firstElement,
  sequence,
  pushMap,
  isFunction,
  isGenerator,
  tco,
  BinaryHeap,
  genWrap,
  logInfo,
  logError,
  genLog
}