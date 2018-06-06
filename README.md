# common-node
----
## What's this?
A routine library for my javascript projects

## Requirements
A JavaScript runtime supports most ES6 features and ES7 async/await

## Install
```bash
npm install --save-prod lotress/common-node
```

## Usage
See [test](./src/test.coffee) for APIs

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
  logInfo,
  logError
} from 'common'
```

Routines for node.js environment are in ``common-node.js``

```javascript
import {getFullPath} from 'common/common-node'
```

## Build from source

```bash
npm install
npm run-script build
```