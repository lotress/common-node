export function identity<T>(T): T
export function None(...any): void

type PrintFn = (message?: any, ...optionalParams: any[]) => void

export function logInfo(message?: any, ...optionalParams: any[]): void
export function logError(message?: any, ...optionalParams: any[]): void

/**
  Decorates a log function by level of importance
  @param level Will return None if level >= 2.
  @param printFn The logging function, typically console.log.bind(console).
  @returns The decorated logging function.
**/
export function genLog(level: number): (printFn: PrintFn) => PrintFn
