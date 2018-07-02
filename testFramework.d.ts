export declare interface ReportObject {
  assert?: boolean
  seq?: number
}

/**
 * Reports assertions .
 *
 * @param reportObject Assertion options.
 * @throws {Error | ReportObject} If test already failed then throws the reportObject, else if any assertion failed then throws Error.
 * @returns Promise<boolean> about whether the assertions hold.
 */
declare type Report = (reportObject: ReportObject) => Promise<boolean>

export function Test(description: string): (testFn: (report: Report) => ReportObject | void) => Promise<boolean>
