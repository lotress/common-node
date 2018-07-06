export declare interface ReportObject {
  /**
   * Assert the given boolean flag, called by testFn.
   *
   * @param flag The assertion.
   * @param message The optional message to log when assertion failed.
   * @returns Promise<boolean> about whether the assertions hold.
   */
  assert(flag: boolean, message?: string): Promise<boolean>
  /**
   * Reports assertions, called by testFn.
   *
   * @param reportObject Assertion options.
   * @param message The optional message to log when assertion failed.
   * @returns Promise<boolean> about whether the assertions hold.
   */
  assertSeq(count: number, message?: string): Promise<boolean>
}

export function Test(description: string): (testFn: (report: ReportObject) => Promise<void> | void) => Promise<boolean>
