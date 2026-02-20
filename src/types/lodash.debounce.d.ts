declare module 'lodash.debounce' {
  type DebouncedFunc<T extends (...args: any[]) => any> = ((
    ...args: Parameters<T>
  ) => ReturnType<T> | undefined) & {
    cancel: () => void
    flush: () => ReturnType<T> | undefined
  }

  export default function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait?: number,
    options?: {
      leading?: boolean
      maxWait?: number
      trailing?: boolean
    },
  ): DebouncedFunc<T>
}
