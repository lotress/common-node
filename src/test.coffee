Test = require './testFramework'
_ = require './common'
{
  identity,
  None,
  isFunction,
  delay,
  deadline,
  retry,
  allAwait,
  raceAwait,
  sequence,
  isGenerator,
  tco,
  BinaryHeap,
  genLog,
  logError
} = _

logInfo = genLog 2

Test('lazy Monad') ({assert, assertSeq}) =>
  status = 1
  seq = 3
  res = []
  f = _.M (x) => x + 1
  .then (x) =>
    assertSeq ++seq
    x
  .then (x) => assert x is 2
  .then => assert status is 2
  .then =>
    throw new Error 'wrong'
  .then => assert false
  .catch (e) => assert e.message is 'wrong'
  .then => assertSeq ++seq

  res.push assertSeq 1

  res.push f 1

  res.push assertSeq 2
  status = 2

  r = f 1
  .then => assertSeq Infinity
  res.push r

  res.push assertSeq 3
  Promise.all res

Test('Monad handler type check') (report) =>
  try
    f = _.M (x) => x + 1
    .then null, logError
    .then do Promise.resolve
    .then => throw new Error 'wrong'
    f 1
  catch e
    report.assert e instanceof TypeError

Test('Immutable Monad') (report) =>
  f = _.M identity
  g = f.then => 1
  h = f.then => 2
  Promise.all [f, g, h].map (fn, i) =>
    fn i
    .then (x) => report.assert x is i

Test('identity') (report) =>
  x = {}
  Promise.all [
    report.assert x is identity.apply @, [x, 1]
    report.assert undefined is do identity
  ]

Test('None') (report) =>
  x = {}
  Promise.all [
    report.assert undefined is None.apply @, [x, {}]
    report.assert undefined is do None
  ]

Test('wait with delay and deadline') (report) =>
  start = Date.now()
  timing = (time) => do delay time
  interval = (k) => (time) =>
    time = time.message if time.message?
    report.assert Date.now() - start >= time * k
    time
  f = _.M timing
  .then interval 1
  .then timing
  .then interval 2
  .then (time) => do deadline time
  .catch interval 3

  f 100

Test('death race') ({assert}) =>
  life = 1000
  f = (time) =>
    a = allAwait [identity, delay(time), delay time * 2]
    g = _.M a
    .then None
    .then a
    .then None
    .then a
    .then =>
      assert Date.now() - start >= time * 6
    h = raceAwait [g, deadline life]
    logInfo "race began with time interval #{time}ms"
    start = Date.now()
    h().then =>
      assert Date.now() - start < life
      logInfo "after #{Date.now() - start}ms,
        should resolve when time interval < #{life} / 6"
    .catch (e) =>
      e = +e.message
      assert e is life
      assert Date.now() - start >= e
      logInfo "after #{Date.now() - start}ms,
        should reject when time interval > #{e} / 6"

  Promise.all [
    f 100
    f 200
  ]

Test('retry') ({assert}) =>
  f = do (times = 3) => (count = 0) => =>
    count += 1
    if count < times
      throw new Error "#{count} < #{times}"
    return count

  g = retry(f()) 3

  Promise.all [
    retry(f())(2)()
    .then => assert false
    .catch (e) => assert e.message is '2 < 3'

    g()
    .then (r) => assert r is 3
    .catch => assert false

    delay(1000)()
    .then g
    .then (r) => assert r is 4
    .catch => assert false
  ]

Test('sequence') ({assert, assertSeq}) =>
  number = ->
    n = 1
    while true
      yield n++
    return

  f = (x) ->
    if x < 5
      assertSeq x
      x
    else undefined

  g = (x) ->
    delay(1000)()
    .then => f x

  s = sequence(g) number()
  Promise.all [
    assertSeq 0
    a = await s
    assert a.every (x, i) => x is i + 1
  ]

Test('isGenerator') (report) =>
  number = ->
    n = 1
    while true
      yield n++
    return

  Promise.all [
    report.assert not isGenerator number
    report.assert isGenerator number()
  ]

Test('tail call optimization') ({assert}) =>
  countFn = (n, res = 0) ->
    if n <= 1
      yield res + n
    else
      yield countFn(n - 1, res + 1)

  countR = (n) =>
    if n <= 1 then n
    else 1 + countR n - 1

  try
    tco identity
    await assert false
  catch e
    await assert e.name is 'TypeError'

  count = tco countFn

  await assert count 1e7

  try
    countR 1e7
    await assert false
  catch e
    await assert e.name is 'RangeError'

Test('Priority Queue') ({assert}) =>
  queue = [2, 1, 4].reduce ((queue, x) => queue.push x)
  , new BinaryHeap()
  assert isFunction queue.push
  assert isFunction queue.peek
  assert isFunction queue.pop
  queue.push 3
  assert queue.peek() is 1
  assert [1, 2, 3, 4].reduce ((flag, x) => flag and x is queue.pop())
  , true
