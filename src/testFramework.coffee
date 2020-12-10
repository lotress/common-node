{logInfo, logError, isFunction} = require './common'
logFail = (description) => (e) =>
  logError "Test #{description} failed"
  logError e if e?
  false

queue = []
running = 0

testEnd = =>
  running -= 1
  if running < 1 and queue.length > 0
    running += 1
    queue.shift()()

Test = (description) =>
  fail = logFail description
  flag = true
  report = { idle }
  for own key, value of do Asserts
    report[key] = do (value) => (...args) =>
      value ...args
      .catch fail
      .then (res) =>
        flag = flag and !!res

  (testFn) =>
    running += 1
    Promise.resolve()
    .then => testFn report
    .then =>
      if flag
        logInfo "Test #{description} passed"
      else do fail
    .catch fail
    .then testEnd

assert = (flag, message = 'assert failed') =>
  flag = await flag
  if not flag then throw new Error message
  true

assertSeq = =>
  count = -Infinity
  (c, message = 'wrong sequence') =>
    c = await c
    if count > c
      throw new Error message
    else
      if isFinite(c) or c is Infinity then count = +c
      true

idle = (r, p) =>
  if running < 2 then return
  p = new Promise((resolve) => r = resolve)
  running -= 1
  queue.push(r)
  p

Asserts = => {assert, assertSeq: do assertSeq}

module.exports = Test
