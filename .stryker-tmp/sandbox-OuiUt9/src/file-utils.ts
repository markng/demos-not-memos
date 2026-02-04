// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { existsSync, unlinkSync } from 'fs';

/**
 * Safely clean up a temporary file if it exists
 * @param path Path to the temporary file
 */
export function cleanupTempFile(path: string): void {
  if (stryMutAct_9fa48("432")) {
    {}
  } else {
    stryCov_9fa48("432");
    if (stryMutAct_9fa48("434") ? false : stryMutAct_9fa48("433") ? true : (stryCov_9fa48("433", "434"), existsSync(path))) {
      if (stryMutAct_9fa48("435")) {
        {}
      } else {
        stryCov_9fa48("435");
        unlinkSync(path);
      }
    }
  }
}

/**
 * Safely clean up an output file if it exists
 * Used when retrying after validation failure
 * @param path Path to the output file
 */
export function cleanupOutputFile(path: string): void {
  if (stryMutAct_9fa48("436")) {
    {}
  } else {
    stryCov_9fa48("436");
    if (stryMutAct_9fa48("438") ? false : stryMutAct_9fa48("437") ? true : (stryCov_9fa48("437", "438"), existsSync(path))) {
      if (stryMutAct_9fa48("439")) {
        {}
      } else {
        stryCov_9fa48("439");
        unlinkSync(path);
      }
    }
  }
}