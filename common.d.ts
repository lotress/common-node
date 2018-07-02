export function identity<T>(T): T
export function None(...any): void

type PrintFn = (message?: any, ...optionalParams: any[]) => void

export function logInfo(message?: any, ...optionalParams: any[]): void
export function logError(message?: any, ...optionalParams: any[]): void

/**
  Decorate a log function by level of importance.
  @param level Will return None if level >= 2.
  @param printFn The logging function, typically console.log.bind(console).
  @returns The decorated logging function.
**/
export function genLog(level: number): (printFn: PrintFn) => PrintFn

type MonadFunction<T> = {
  /**
   * Execute the original function.
   * @param any The parameters for the original executor function.
   * @returns A Promise for the completion of the executor.
   */
  (...any): Promise<T>
  /**
   * Attaches a callback for only the rejection of the MonadFunction.
   * @param onrejected The callback function to execute when the Promise is rejected.
   * @returns A MonadFunction for the completion of the callback.
   */
  catch<EResult = never>
    (onRejected: ((error: any) => EResult | Promise<EResult>) | MonadFunction<EResult>): MonadFunction<T | EResult>
  /**
   * Attaches callbacks for the resolution and/or rejection of the MonadFunction.
   * @param onfulfilled The callback function to execute when the Promise is resolved.
   * @param onrejected The callback function to execute when the Promise is rejected.
   * @returns A MonadFunction for the completion of which ever callback is executed.
   */
  then<U, E = never>(onFulfilled?: ((value: T) => U | Promise<U>) | MonadFunction<U>,
    onRejected?: ((error: any) => E | Promise<E>) | MonadFunction<E>): MonadFunction<U | E>
}

/**
  Decorate a function with Continuation Monad methods.
  @param f Any function, other value will be wrapped in a function returning the value.
  @returns The decorated monad.
**/
export function M<T, E = never>(f: ((...any) => T | E) | Promise<T | E>): MonadFunction<T | E>

/**
  Returns a function when called, it resolves with timeout after timeout milliseconds passed
  @param timeout Time out in millisecond.
  @returns Function without parameters, returning a Promise.
**/
export function delay(timeout: number): () => Promise<number>

/**
  Returns a function when called, it rejects with timeout after timeout milliseconds passed
  @param timeout Time out in millisecond.
  @returns Function without parameters, returning a Promise.
**/
export function deadline(timeout: number): () => Promise<number>

export function allAwait(funcs: ((...any) => any)[]): (args: any[][]) => Promise<ReturnType<any>[]>

export function raceAwait(funcs: ((...any) => any)[]): (args: any[][]) => Promise<ReturnType<any>[]>

/**
  Decorate a function which possibily throws with a retry count,
  try the function sequencely until it returned successfully or retryCount reached
  @param f The function to try.
  @param retryCount Times to retry.
  @returns Decorated function accepting original parameters and returning Promise.
  @throws TypeError if f isn't a function.
  @throws Error if retryCount isn't >= 0.
  @throws Reject with undefined if retryCount given is 0.
  @throws Reject with the error thrown by the original function if it didn't success until retryCount reached.
**/
export function retry<T, E = never>(f: (...any) => T | Promise<T | E>): (retryCount: number)
  => (...any) => Promise<T | E>

/**
Takes an unary function, then an Iterable as its argument,
applies the function sequencely (wait before next) on values provided by the Iterable,
until the Iterable reached end or the function returned undefined or null.
@param f The function to execute.
@param iterable The Iterable as its argument.
@returns All non-null results of the function.
**/
export function sequence<I, T>(f: (I) => T | Promise<T> | undefined | null): (iterable: Iterable<I>) => Promise<T[]>
