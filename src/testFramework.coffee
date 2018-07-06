{logInfo, logError, isFunction} = require './common'
logFail = (description) => (e) =>
  logError "Test #{description} failed"
  logError e if e?
  false

Test = (description) =>
  fail = logFail description
  flag = true
  report = {}
  for own key, value of do Asserts
    report[key] = do (value) => (...args) =>
      value ...args
      .catch fail
      .then (res) =>
        flag = flag and !!res

  (testFn) =>
    Promise.resolve()
    .then => testFn report
    .then =>
      if flag
        logInfo "Test #{description} passed"
      else do fail
    .catch fail

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

Asserts = => {assert, assertSeq: do assertSeq}

module.exports = Test
