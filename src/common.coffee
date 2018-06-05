isType = (type) => (x) => typeof x is type
isObject = isType 'object'
isFunction = isType 'function'

concatArr = (arr, cur) => arr.concat if Array.isArray cur then cur else [cur]

flatArray = (arr) => arr.reduce concatArr, []

flatObject = (o) =>
  res = {}
  for key of o when o[key]? and o.hasOwnProperty key
    if (isObject o[key]) and (not Array.isArray o[key])
      Object.assign res, flatObject o[key]
    else if not res[key]? then res[key] = o[key]
  res

identity = (x) => x
None = => undefined

isSymmetry = (f) => (...args) =>
  l = f ...args
  r = f ...args.reverse()
  l is r

isIterable = (x) => isObject(x) and x[Symbol.iterator]
getIterator = (x) => x[Symbol.iterator]()
isMultiIterable = (x) => isIterable(x) and not isSymmetry(getIterator) x

mapList = (func) => (list) ->
  for item from list
    x = func list
    if isIterable x
      yield* x
    else
      yield x

# M constructs a Monad wrapping a deferred function using Promise
# M(f) is lazy and reinvokable just like a plain function
# with .then and .catch methods like a Promise
M = do =>
  handler = (onFulfilled, onRejected) ->
    if not isFunction onFulfilled then onFulfilled = null
    if not isFunction onRejected then onRejected = null
    if onFulfilled or onRejected
      @deferreds.push {onFulfilled, onRejected}
    @
  reject = (onRejected) -> @then null, onRejected
  (f) =>
    if not isFunction f
      _t = f
      f = => _t
    deferreds = []
    r = (...args) ->
      # everytime when r is called,
      # we new a Promise and append every deferreds to it,
      # so r is reinvokable
      p = Promise.resolve()
      .then => f ...args
      for d in deferreds
        p = p.then d.onFulfilled, d.onRejected
      deferreds = null
      p
    r.deferreds = deferreds
    Object.assign r,
      # since M(f) is just a function and
      # Promise.prototype.then will lift function to Promise, leaving Promise untouched.
      # we use .then alias for both .map and .bind in a typical Monad
      then: handler.bind r
      catch: reject.bind r

bindObject = (o, name) => o[name].bind o

allPromise = bindObject Promise, 'all'
racePromise = bindObject Promise, 'race'

invokeAsync = (func) => (args...) -> await func args...

expandApply = (func) => (arr) => func arr...
mapArr = (func) => (arr) => arr.map func
zipApplyArr = (a1) => (a2) => a1.map (f, i) => f a2[i]
invokePromises = (predicate) => (funcs) =>
  g = (f) => expandApply invokeAsync f
  fz = zipApplyArr mapArr(g) funcs
  (arr) => predicate fz arr
allAwait = invokePromises allPromise
raceAwait = invokePromises racePromise
apply = (func) =>
  f = expandApply invokeAsync func
  (mapFunc) => mapFunc f

makeFrame = (keys) => (values) =>
  o = {}
  keys.forEach (key, i) =>
    if values[i] isnt undefined then o[key] = values[i]
  o

firstElement = (iterable) => iterable[Symbol.iterator]().next().value

pall = (fn) => (items) => allPromise mapArr(fn) items

pushMap = (map) => (item) => (key) =>
  c = map.get key
  c ?= []
  c.push item
  map.set key, c

delay = (timeout) => =>
  new Promise (resolve) =>
    setTimeout (=> resolve(timeout)), timeout

deadline = (timeout) => =>
  new Promise (resolve, reject) =>
    setTimeout (=> reject(timeout)), timeout

retry = (f) => (count = 1) => (...args) =>
  do g = (e = undefined) =>
    if count--
      Promise.resolve f ...args
      .catch g
    else
      Promise.reject e

logLevel = 2

genLog = do (logLevel) => (level) => (func) =>
  if logLevel > level
    func
  else
    None

###eslint no-console: 0###
logInfo = genLog(1) bindObject console, 'log'

logError = genLog(-1) bindObject console, 'error'

getFullPath = (directory) =>
  path = require 'path'
  p = path.join process.cwd(), directory
  (name) =>
    path.join p, name

module.exports = {
  concatArr,
  flatArray,
  flatObject,
  identity,
  None,
  M,
  invokeAsync,
  allAwait,
  raceAwait,
  delay,
  deadline,
  retry,
  makeFrame,
  firstElement,
  pall,
  pushMap,
  logInfo,
  logError,
  getFullPath
}