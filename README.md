# common-node
----
## What's this?
A routine library simplifies functional asynchronous javascript.

## Requirements
A JavaScript runtime supports most ES6 features and ES7 async/await, e.g Node.js >= v10.0.

## Install
```bash
npm install --save-prod lotress/common-node
```

## Usage
See [test](./src/test.coffee) for examples of APIs.

### Javascript Library

```javascript
import {
  identity,
  None,
  M,
  allAwait,
  raceAwait,
  delay,
  deadline,
  retry,
  pushMap,
  sequence,
  tco,
  BinaryHeap,
  genWrap,
  genLog,
  logInfo,
  logError
} from 'common-node'
```

`identity = x => x`

`None = _ => void 0`

`logInfo` and `logError` are alias for `console.log` and `console.error`,
they are made by `genLog` with logLevel = 2,
you can call `genLog` with your logLevel,
less logLevel is more important.

- Example

```javascript
const logInfo = genLog(1)(console.log.bind(console))

const logError = genLog(-1)(console.error.bind(console))

logInfo(identity('hello')) // hello
logError(None('wrong')) // undefined
```
----
`M` takes a function, wrap it into a Monad which can be called as the original function,
with additional `.then` and `.catch` interface.

`M: (input: *any -> output: any) -> ContinuationMonad`

`ContinuationMonad: input -> Promise(-> output)`

`ContinuationMonad.then: (onFulfilled: (input: output -> output: any)?, onRejected: (reason: any -> any)?) -> ContinuationMonad`
at least one of two callbacks is required.

`ContinuationMonad.catch: (onRejected: (reason: any -> any)) -> ContinuationMonad`

- Example

```javascript
let f = M(x => new Promise(resolve => setTimeout((_ => resolve(x)), 1000)))
.then(x => logInfo(x))
.then(_ => new Promise((_, reject) => setTimeout((_ => reject('wrong')), 1000)))
.catch(e => logError(e))

// do something
// you can manipulate f like a normal function
// or attach more callbacks to it

f('hello') // ContinuationMonad can be called multiple times, all callbacks are kept
f('world')
// waiting about 1s
// print 'hello'
// print 'world', order may change since they are asynchronous calls
// waiting about 1s
// log error 'wrong'
// log error 'wrong'
```
----
`delay` and `deadline` are functions return a Promise resolve/reject after given timeout.

`delay: (time: number) -> () -> Promise(-> time)`

`deadline: (time: number) -> () -> Promise(-> time)`

`allAwait` and `raceAwait` are lazy modification of Promise.all and Promise.race.

`allAwait: (funcs: Array[input: *any -> output: any]) -> (args: Array[input]) -> Promise(-> Array[output])`

`raceAwait: (funcs: Array[input: *any -> output: any]) -> (args: Array[input]) -> Promise(-> Array[output])`

args are passed to funcs with same index

- Example, see `Test('death race')` in [test](./src/test.coffee)

```javascript
let life = 1000
let f = time => {
  let awaitFunc = allAwait([identity, delay(time), delay(time * 2)])
  let g = M(awaitFunc)
  .then(None) // no arguments should be passed to awaitFunc here
  .then(awaitFunc)
  .then(None)
  .then(awaitFunc)

  let h = raceAwait([g, deadline(life)])
  logInfo(`race began with time interval ${time}ms`)
  let start = Date.now()
  return h().then(_ => {
    logInfo(`after 600ms, race ends`)
  }).catch(e => {
    logError(`after 1000ms, life ends`)
  })
}

f 100
f 200
/*
print 'race began with time interval 100ms'
print 'race began with time interval 200ms'
waiting about 600ms
print 'after 600ms, race ends'
waiting about 400ms
log error 'after 1000ms, life ends'
*/
```
----
`retry` takes a function (synchronous or asynchronous) which possibly throws and a retry count,
returns a wrapped function with same input parameters,
call this wrapped function will repeatly try the original one until it didn't throw or retry count met,
return a Promise, if the original function didn't throw then resolve its return value,
else reject with the error it thrown.

`retry: (input: *any -> output: any) -> (retryCount: number) -> (input: *any) -> Promise(-> output)`

- Example, see `Test('retry')` in [test](./src/test.coffee)

```javascript
let f = (times = 3) => {
  var count = 0
  return _ => {
    count += 1
    if (count < times)
      throw new Error(`${count} < ${times}`)
    return count
  }
}

retry(f())(2)()
.catch(e => logError(e.message)) // log error '2 < 3'

retry(f())(3)()
.then(logInfo) // print '3'
```
----
`sequence` takes a function then a iterable object,
sequential apply and wait the function on elements of the iterable,
loop ends if the function returns `null` or `undefined` or reached the end of the iterable,
if `memory` is `true` then results will be returned in an Array, else returns `undefined`.

`sequence: (input: any -> output: any, memory = true) -> (iter: iterable) -> Promise(-> array[output])`

- Example, see `Test('sequence')` in [test](./src/test.coffee)

```javascript
let number = function*() {
  var n;
  n = 1;
  while (true) {
    yield n++;
  }
};

let f = x => x < 5 ? x : void 0

let g = x => delay(1000)()
  .then(_ => f(x))

console.log(await sequence(g)(number())) // [1, 2, 3, 4] after 5s
```
----
`isGenerator` checks if the given object is a Generator.
Given g as input, it returns True if g is a Generator, g if g is falsy, otherwise false.

`isGenerator: any -> boolean`

`tco` is a tail call optimizer utilizing generator function.
For a recursive function f without `yield` and only recurse on tail,
replace its tail call's `return` with `yield`,
so it becomes a `GeneratorFunction`, then wrap it by `tco`,
the result function should work the same as the original recursive function without piling stack.

`tco: (f: GeneratorFunction) -> ...any -> any`

- Example, see `Test('sequence')` in [test](./src/test.coffee)

#### The classic style of a resursive function

```javascript
const countR = n => n < 1 ? n : 1 + countR(n - 1)

try {
  countR(1e7)
} catch (e) {
  console.log(e.toString()) // RangeError: Maximum call stack size exceeded
}
```

#### The optimized style

```javascript
const countG = function*(n, res) {
  if (n < 1)
    yield n
  else
    yield countG(n - 1, res + 1)
}

let count = tco(countG)

console.log(count(1e7)) // 10000000
```
----
After comparing the performance of several priority queue implementations,
we implemented a `BinaryHeap` using a typed key array.
The keys used for comparing stored in a `TypedArray`, the type was assigned when constructing the heap.
The heap will keep the item with minimal key on the top.
The `BinaryHeap` can be constructed by a given option object, the default option is
`{Type = Float64Array, simple = false}`.
If simple is `true`, the heap will only store keys, otherwise every item can includes a corresponding value.

```javascript
let heap = BinaryHeap({Type: Uint8Array, simple: true})
heap.push(2).push(1).push(4)
console.log(heap.pop()) // 1
console.log(heap.peek()) // 2
let heap2 = BinaryHeap()
heap2.push(0.1, 'more').push(-1, 'less').push(0, 'zero')
console.log(heap2.pop()) // [-1, "less"]
console.log(heap2.pop()) // [0, "zero"]
console.log(heap2.pop()) // [0.1, "more"]
console.log(heap2.pop()) // undefined
```
----
`genWrap` takes a Class then returns a factory function of this class.

```javascript
let w = genWrap(Error)
// all arguments will be passed to the constructor if the first argument is not instance of the class
let e = w('my error')
let ee = w(e)
console.log(e === ee) // true
console.log(ee.message) // my error
```

### Node.js Library

Routines for node.js environment are in ``common-node.js``.

```javascript
import {getFullPath} from 'common-node/common-node'
```

`getFullPath: (directory: string) -> (name: string) -> path: string`

- Example

```javascript
let path = getFullPath('./../common')('src/../common.js')
console.log(path) // ${cwd}\common\common.js under Windows
```

### Test Framework

A framework for unit test in `testFramework.js`.

```javascript
import {Test} from 'common-node/testFramework'
```

For each test case, call Test with description and you test procedure.

`Test: (description: string) -> ((report: ReportObject) -> Promise | undefined) -> Promise(-> boolean)`

In test procedure, you can call a reportFn in the given ReportObject for an assertion.

There are two kind of assertion now,
`assert` for a boolean value, pass if the value is truly;
`assertSeq` for monotonous increase sequence number,
pass if seq number is larger than last called,
initial value for seq number is -Infinity.
A optional message can be given to log when assertion failed.

`ReportObject: {assert?: boolean, seq?: number}`

`report.assert: (boolean | Promise(-> boolean), message = 'assert failed') -> Promise(-> boolean)`

`report.assertSeq: (number | Promise(-> number), message = 'wrong sequence') -> Promise(-> boolean)`

- Example

```javascript
Test('example test')(report =>
  let start = Date.now()
  let p = delay(1000)()

  p.then(_ => {
    return Promise.all([
      report.assertSeq(2)
      report.assert(Date.now() - start > 999)
    ])
  })

  report.assertSeq(1)
  return p
)
```

## Build from source

```bash
npm install
npm run-script build
```
