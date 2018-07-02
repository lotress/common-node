Test = require './testFramework'
_ = require './common'
{
  identity,
  None,
  delay,
  deadline,
  retry,
  allAwait,
  raceAwait,
  sequence,
  logInfo,
  logError
} = _

Test('lazy Monad') (report) =>
  status = 1
  seq = 3
  f = _.M (x) => x + 1
  .then (x) =>
    report seq: ++seq
    x
  .then (x) => report assert: x is 2
  .then => report assert: status is 2
  .then =>
    throw new Error 'wrong'
  .then => report assert: false
  .catch (e) => report assert: e.message is 'wrong'
  .then => report seq: ++seq

  report seq: 1

  f 1

  report seq: 2
  status = 2

  f 1
  .then => report seq: Infinity

  report seq: 3

Test('Monad handler type check') (report) =>
  try
    f = _.M (x) => x + 1
    .then null, logError
    .then do Promise.resolve
    .then => throw new Error 'wrong'
    f 1
  catch e
    report assert: e instanceof TypeError

Test('Immutable Monad') (report) =>
  f = _.M identity
  g = f.then => 1
  h = f.then => 2
  [f, g, h].forEach (fn, i) =>
    fn i
    .then (x) => report assert: x is i

Test('identity') (report) =>
  logInfo "test #2"
  x = {}
  report assert: x is identity.apply @, [x, 1]
  report assert: undefined is do identity

Test('None') (report) =>
  logInfo "test #3"
  x = {}
  report assert: undefined is None.apply @, [x, {}]
  report assert: undefined is do None

Test('wait with delay and deadline') (report) =>
  start = Date.now()
  timing = (time) => do delay time
  interval = (k) => (time) =>
    report assert: Date.now() - start >= time * k
    time
  f = _.M timing
  .then interval 1
  .then timing
  .then interval 2
  .then (time) => do deadline time
  .catch interval 3

  f 100

Test('death race') (report) =>
  life = 1000
  f = (time) =>
    a = allAwait [identity, delay(time), delay time * 2]
    g = _.M a
    .then None
    .then a
    .then None
    .then a
    .then =>
      report assert: Date.now() - start >= time * 6
    h = raceAwait [g, deadline life]
    logInfo "race began with time interval #{time}ms"
    start = Date.now()
    h().then =>
      report assert: Date.now() - start < life
      logInfo "after #{Date.now() - start}ms,
        should resolve when time interval < #{life} / 6"
    .catch (e) =>
      report assert: e is life
      report assert: Date.now() - start >= e
      logInfo "after #{Date.now() - start}ms,
        should reject when time interval > #{e} / 6"

  f 100
  f 200

Test('retry') (report) =>
  f = (times = 3) =>
    count = 0
    =>
      count += 1
      if count < times
        throw new Error "#{count} < #{times}"
      return count

  retry(f())(2)()
  .then => report assert: false
  .catch (e) => report assert: e.message is '2 < 3'

  retry(f())(3)()
  .then (r) => report assert: r is 3
  .catch => report assert: false

Test('sequence') (report) =>
  number = ->
    n = 1
    while true
      yield n++
    return

  f = (x) ->
    if x < 5
      report seq: x
      x
    else undefined

  g = (x) ->
    delay(1000)()
    .then => f x

  s = sequence(g) number()
  report seq: 0
  a = await s
  report assert: a.every (x, i) => x is i + 1
