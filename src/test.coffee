Test = require './testFramework'
_ = require './common'

test1 = Test('lazy Monad') (report) =>
  f = _.M (x) => x
  .then (x) => report assert: x is 1
  .then => report seq: 2
  .then => throw new Error 'wrong'
  .then => report assert: false
  .catch (e) => report assert: e.message is 'wrong'
  .then => report seq: 3

  report seq: 1

  f 1
  .then => report seq: Infinity
