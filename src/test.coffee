Test = require './testFramework'
_ = require './common'
{
  identity,
  None,
  delay,
  deadline,
  retry,
  logInfo,
  logError
} = _

Test('lazy Monad') (report) =>
  logInfo "test #1"
  f = _.M (x) => x
  .then (x) => report assert: x is 1
  .then => report seq: 2
  .then =>
    logError 'throw an error in test #1'
    throw new Error 'wrong'
  .then => report assert: false
  .catch (e) => report assert: e.message is 'wrong'
  .then => report seq: 3

  report seq: 1

  f 1
  .then => report seq: Infinity

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
