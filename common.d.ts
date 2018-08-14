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

type RejectCallback<E> = ((error: any) => E | PromiseLike<E>) | MonadFunction<E>
type ResolveCallback<T, U> = ((value: T) => U | PromiseLike<U>) | MonadFunction<U>
declare interface MonadFunction<T> {
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
  catch<E = never>(onRejected: RejectCallback<E>): MonadFunction<T | E>
  /**
   * Attaches callbacks for the resolution and/or rejection of the MonadFunction.
   * @param onfulfilled The callback function to execute when the Promise is resolved.
   * @param onrejected The callback function to execute when the Promise is rejected.
   * @returns A MonadFunction for the completion of which ever callback is executed.
   */
  then<U, E = never>(onFulfilled?: ResolveCallback<T, U>, onRejected?: RejectCallback<E>): MonadFunction<U | E>
}

/**
  Decorate a function with Continuation Monad methods.
  @param f Any function,
    MonadFunction compatible value will be directly returned,
    other value will be wrapped in a function returning the value.
  @returns The decorated monad.
**/
export function M<T, E = never>(f: ((...any) => T | E) | PromiseLike<T | E> | T): MonadFunction<T | E>

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
export function retry<T, E = never>(f: (...any) => T | PromiseLike<T | E>): (retryCount: number)
  => (...any) => Promise<T | E>

/**
Takes an unary function, then an Iterable as its argument,
applies the function sequencely (wait before next) on values provided by the Iterable,
until the Iterable reached end or the function returned undefined or null.
@param f The function to execute.
@param iterable The Iterable as its argument.
@returns All non-null results of the function.
**/
export function sequence<I, T>(f: (I) => NonNullable<T> | PromiseLike<NonNullable<T>> | undefined | null):
  (iterable: Iterable<I>) => Promise<NonNullable<T>[]>

/**
Check if the given object is a Generator.
@param g The object to check.
@returns True if g is a Generator, g if g is falsy, otherwise false.
**/
export function isGenerator(g: any): boolean

/**
For a recursive function f without yield and only recurse on tail,
replace its tail call's `return` with `yield`,
so it becomes a `GeneratorFunction`, then wrap it by `tco`,
the result function should work the same as the original recursive function without piling stack.
@param f The GeneratorFunction.
@returns Tail call optimizied function.
**/
export function tco(f: GeneratorFunction): (...any) => any

interface BinaryHeap<Key, Value> {
  /**
  Extract the minimal item of the heap, this item will be removed from the heap.
  @returns The minimal key if the heap was constructed with simple = true, else the minimal [key, value].
  **/
  pop(): [Key, Value] | Key
  /**
  Peek the minimal item of the heap.
  @returns The minimal key if the heap was constructed with simple = true, else the minimal [key, value].
  **/
  peek(): [Key, Value] | Key
  /**
  Push key and optional value into the heap.
  @param key The key for comparing.
  @param value The value mapped by the key.
  @returns The heap itself.
  **/
  push(key: Key, value?: Value): BinaryHeap<Key, Value>
}

interface BinaryHeapOption {
  Type?: Int8ArrayConstructor | Int16ArrayConstructor | Int32ArrayConstructor |
    Uint8ArrayConstructor | Uint16ArrayConstructor | Uint32ArrayConstructor | Uint8ClampedArrayConstructor |
    Float32ArrayConstructor | Float64ArrayConstructor
  simple?: boolean
}
/**
Construct a typed binary heap.
@param option The constructor option: {@param Type A TypedArrayConstructor matched type of comparing keys,
  @param simple True if only store keys, false if map key to a value}.
**/
interface BinaryHeapConstructor {
  new(option?: BinaryHeapOption): BinaryHeap<Number, any>
  (option?: BinaryHeapOption): BinaryHeap<Number, any>
}
export const BinaryHeap: BinaryHeapConstructor

export function genWrap(Class: ObjectConstructor): (obj: any, ...any) => Object