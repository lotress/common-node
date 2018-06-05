logFail = (description) => (e) =>
  console.error "Test #{description} failed with message: #{e.message}"

Test = (description) =>
  fail = logFail description

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
      else throw o
    Promise.resolve()
    .then => await testFn report
    .then (o) =>
      if flag
        await assertBy o
      else throw o
    .then =>
      if flag then console.log "Test #{description} passed"
    .catch fail

assert = (flag) =>
  if not flag then throw new Error 'assert failed'
  flag

assertSeq = =>
  count = 0
  (c) =>
    if count > c
      throw new Error 'wrong sequence'
    else
      if isFinite(c) or c is Infinity then count = +c
      true

assertBy = (o) =>
  p = []
  for key, value of o
    p.push Promise.resolve asserts[key] value
  Promise.all p
  .then (res) => res.every (flag) => !!flag
  .then assert

asserts = {assert, seq: assertSeq}

module.exports = Test