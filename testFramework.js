// Generated by CoffeeScript 2.7.0
var Asserts, Test, assert, assertSeq, idle, isFunction, logError, logFail, logInfo, queue, running, testEnd,
  hasProp = {}.hasOwnProperty;

({logInfo, logError, isFunction} = require('./common'));

logFail = (description) => {
  return (e) => {
    logError(`Test ${description} failed`);
    if (e != null) {
      logError(e);
    }
    return false;
  };
};

queue = [];

running = 0;

testEnd = () => {
  running -= 1;
  if (running < 1 && queue.length > 0) {
    running += 1;
    return queue.shift()();
  }
};

Test = (description) => {
  var fail, flag, key, ref, report, value;
  fail = logFail(description);
  flag = true;
  report = {idle};
  ref = Asserts();
  for (key in ref) {
    if (!hasProp.call(ref, key)) continue;
    value = ref[key];
    report[key] = ((value) => {
      return (...args) => {
        return value(...args).catch(fail).then((res) => {
          return flag = flag && !!res;
        });
      };
    })(value);
  }
  return (testFn) => {
    running += 1;
    return Promise.resolve().then(() => {
      return testFn(report);
    }).then(() => {
      if (flag) {
        return logInfo(`Test ${description} passed`);
      } else {
        return fail();
      }
    }).catch(fail).then(testEnd);
  };
};

assert = async(flag, message = 'assert failed') => {
  flag = (await flag);
  if (!flag) {
    throw new Error(message);
  }
  return true;
};

assertSeq = () => {
  var count;
  count = -2e308;
  return async(c, message = 'wrong sequence') => {
    c = (await c);
    if (count > c) {
      throw new Error(message);
    } else {
      if (isFinite(c) || c === 2e308) {
        count = +c;
      }
      return true;
    }
  };
};

idle = (r, p) => {
  if (running < 2) {
    return;
  }
  p = new Promise((resolve) => {
    return r = resolve;
  });
  running -= 1;
  queue.push(r);
  return p;
};

Asserts = () => {
  return {
    assert,
    assertSeq: assertSeq()
  };
};

module.exports = Test;

//# sourceMappingURL=testFramework.js.map
