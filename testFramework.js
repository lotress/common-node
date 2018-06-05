// Generated by CoffeeScript 2.3.0
var Test, assert, assertBy, assertSeq, asserts, logFail;

logFail = (description) => {
  return (e) => {
    return console.error(`Test ${description} failed with message: ${e.message}`);
  };
};

Test = (description) => {
  var fail;
  fail = logFail(description);
  return (testFn) => {
    var failPass, flag, report;
    flag = true;
    failPass = (e) => {
      flag = false;
      fail(e);
      throw e;
    };
    report = (o) => {
      if (flag) {
        return Promise.resolve(o).then(async(o) => {
          return (await assertBy(o));
        }).catch(failPass);
      } else {
        throw o;
      }
    };
    return Promise.resolve().then(async() => {
      return (await testFn(report));
    }).then(async(o) => {
      if (flag) {
        return (await assertBy(o));
      } else {
        throw o;
      }
    }).then(() => {
      if (flag) {
        return console.log(`Test ${description} passed`);
      }
    }).catch(fail);
  };
};

assert = (flag) => {
  if (!flag) {
    throw new Error('assert failed');
  }
  return flag;
};

assertSeq = () => {
  var count;
  count = 0;
  return (c) => {
    if (count > c) {
      throw new Error('wrong sequence');
    } else {
      if (isFinite(c) || c === 2e308) {
        count = +c;
      }
      return true;
    }
  };
};

assertBy = (o) => {
  var key, p, value;
  p = [];
  for (key in o) {
    value = o[key];
    p.push(Promise.resolve(asserts[key](value)));
  }
  return Promise.all(p).then((res) => {
    return res.every((flag) => {
      return !!flag;
    });
  }).then(assert);
};

asserts = {
  assert,
  seq: assertSeq
};

module.exports = Test;
