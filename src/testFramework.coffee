{logInfo, logError, isFunction} = require './common'
logFail = (description) => (e) =>
  logError "Test #{description} failed with message: #{e.message}"
  false

Test = (description) =>
  fail = logFail description
  assertBy = AssertBy do Asserts

  (testFn) =>
    flag = true
    failPass = (e) =>
      flag = false
      fail e
      throw e
    report = (o) =>
      if flag
        Promise.resolve o
        .then (o) => await assertBy o
        .catch failPass
        .then => flag
      else throw o
    Promise.resolve()
    .then => await testFn report
    .then (o) =>
      if flag
        await assertBy o
      else throw o
    .then =>
      if flag then logInfo "Test #{description} passed"
      flag
    .catch fail

assert = (flag) =>
  if not flag then throw new Error 'assert failed'
  flag

assertSeq = =>
  count = -Infinity
  (c) =>
    if count > c
      throw new Error 'wrong sequence'
    else
      if isFinite(c) or c is Infinity then count = +c
      true

AssertBy = (asserts) => (o) =>
  p = []
  for key, value of o when isFunction asserts[key]
    p.push Promise.resolve asserts[key] value
  Promise.all p
  .then (res) => res.every (flag) => !!flag
  .then assert

Asserts = => {assert, seq: do assertSeq}

module.exports = Test