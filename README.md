# common-node
----
## What's this?
A routine library for my javascript projects

## Requirements
A JavaScript runtime supports most ES6 features and ES7 async/await, e.g Node.js >= v8.0

## Install
```bash
npm install --save-prod lotress/common-node
```

## Usage
See [test](./src/test.coffee) for examples of APIs

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
  logInfo,
  logError
} from 'common-node'
```

`identity = x => x`

`None = _ => void 0`

`logInfo` and `logError` are alias for `console.log` and `console.error`

- Example

```javascript
logInfo(identity('hello')) // hello
logError(None('wrong')) // undefined
```
----
`M` takes a function, wrap it into a Monad which can be called as the original function, with additional `.then` and `.catch` interface

`M: (input: *any -> output: any) -> ContinuationMonad`

`ContinuationMonad: input -> Promise(-> output)`

`ContinuationMonad.then: (onFulfilled: (input: output -> output: any)?, onRejected: (reason: any -> any)?) -> ContinuationMonad`
at least one of two callbacks is required

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
`delay` and `deadline` are functions return a Promise resolve/reject after given timeout

`delay: (time: number) -> () -> Promise(-> time)`

`deadline: (time: number) -> () -> Promise(-> time)`

`allAwait` and `raceAwait` are lazy modification of Promise.all and Promise.race

`allAwait: (funcs: Array[input: *any -> output: any]) -> (args: Array[input]) -> Promise(-> Array[output])`

`deadline: (funcs: Array[input: *any -> output: any]) -> (args: Array[input]) -> Promise(-> Array[output])`

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
else reject with the error it thrown

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
results return in an Array.

`sequence: (input: any -> output: any) -> (iter: iterable) -> Promise(-> array[output])`

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

### Node.js Library

Routines for node.js environment are in ``common-node.js``

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

A framework for unit test in `testFramework.js`

```javascript
import {Test} from 'common-node/testFramework'
```

For each test case, call Test with description and you test procedure

`Test: (description: string) -> ((report: reportFn) -> ReportObject?) -> Promise(-> boolean)`

in test procedure, you can return a ReportObject or call reportFn with a ReportObject for an assertion

`reportFn: ReportObject -> Promise(-> true) | Promise.reject()`

there are two kind of assertion now,
assert for a boolean value, pass if the value is truly;
seq for monotonous increase sequence number, pass if seq number is larger than last called, initial value for seq number is -Infinity

`ReportObject: {assert?: boolean, seq?: number}`

- Example

```javascript
Test('example test')(report =>
  let start = Date.now()
  let p = delay(1000)()

  p.then(_ => report({seq: 2, assert: Date.now() - start > 999}))

  report({seq: 1})
)
```

## Build from source

```bash
npm install
npm run-script build
```

## Planned feature in v1.2

- A tail recursion optimizer wrapping generator function, replace your `return` calls with `yield`
- A priority queue, maybe implemented using Binomial Heap
