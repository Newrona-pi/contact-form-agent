declare module 'react-dom' {
  export function useFormState<T, A>(
    action: (state: T, formData: FormData) => A | Promise<A>,
    initialState: T
  ): [T, (formData: FormData) => void];
}
