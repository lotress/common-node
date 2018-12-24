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
  genWrap,
  genLog,
  logInfo,
  logError,
  newMessageQueue,
  newPool
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
    k = 1
    while true
      k = yield n + k
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
    assert a.every (x, i) => x is i + 2
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
  , new BinaryHeap simple: true
  assert isFunction queue.push
  assert isFunction queue.peek
  assert isFunction queue.pop
  queue.push 3
  assert queue.peek() is 1
  assert [1, 2, 3, 4].reduce ((flag, x) => flag and x is queue.pop())
  , true
  N = 1e6
  data = ({v: Math.random()} for i in [1..N])
  compare = (a, b) => a.v - b.v
  queue = new BinaryHeap()
  console.time "Heapsort #{N}"
  data.forEach (x) => queue.push x.v, x
  res1 = (queue.pop() for i in [1..N])
  console.timeEnd "Heapsort #{N}"
  console.time "Array sort #{N}"
  resA = data.sort compare
  console.timeEnd "Array sort #{N}"
  assert resA.every (item, i) => item is res1[i][1]

Test('Wrapper Generator') ({assert}) =>
  f = (x) ->
    @x = x.length
    return
  w = genWrap f
  r = w 'aaa'
  rr = w r
  assert r.x is 3
  assert r is rr
  try
    genWrap 'wrong'
    assert false
  catch e
    assert e instanceof TypeError

Test('Message Queue') ({assert}) =>
  items = []
  [newItem, popItem] = newMessageQueue 2, items
  newItem() for i in [1..4]
  id = items[2].id
  item = popItem 2
  assert item.id is id
  item = newItem()
  assert (item.id & 3) is 2
  try
    newItem()
    assert false
  catch e
    assert e.message is 'Full'

Test('Pool') ({assert}) =>
  pool = [1, 2, 3]
  s = new Set()
  [acquire, release] = newPool pool
  a = acquire()
  c = 0
  timeout = 20
  times = 99
  f = =>
    if c > times
      return
    c += 1
    w = await do a.next
    v = w.value
    assert not s.has v
    s.add v
    new Promise (resolve) =>
      setTimeout resolve, timeout
    .then ->
      assert s.has v
      s.delete v
      release v
      f()
  new Promise (resolve) =>
    setTimeout resolve, 1000
  .then =>
    start = Date.now()
    Promise.all [f(), f(), f()]
    .then => start
  .then (start) ->
    elapse = Date.now() - start
    assert elapse * 3 >= timeout * times > elapse * 2