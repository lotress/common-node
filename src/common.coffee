concatArr = (res, arr) =>
  res.concat arr

flatArray = (arr) =>
  arr.reduce concatArr, []

flatObject = (o) =>
  res = {}
  for key of o when o[key]? and o.hasOwnProperty key
    if (typeof o[key] is 'object') and (not Array.isArray o[key])
      Object.assign res, flatObject o[key]
    else if not res[key]? then res[key] = o[key]
  res

identity = (x) => x
None = => undefined

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

pall = (fn) => (items) =>
  allPromise items.map fn

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