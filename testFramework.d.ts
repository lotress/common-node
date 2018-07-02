export declare interface ReportObject {
  assert?: boolean
  seq?: number
}

/**
 * Reports assertions, called by testFn.
 *
 * @param reportObject Assertion options.
 * @throws {Error | ReportObject} If test already failed then throws the reportObject, else if any assertion failed then throws Error.
 * @returns Promise<true> if the assertions hold.
 */
declare type Report = (reportObject: ReportObject) => Promise<true>

export function Test(description: string): (testFn: (report: Report) => ReportObject | Promise<any> | void) => Promise<boolean>
