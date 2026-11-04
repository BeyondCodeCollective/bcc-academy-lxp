// Server actions cannot be aborted by the browser. Cancel delivery instead,
// including errors, when the owning effect is cleaned up or unmounted.
export function startLearnerRequest<T>(request: () => Promise<T>, onResult: (result: T) => void, onError: () => void) {
  let active = true;
  void Promise.resolve().then(request).then(
    result => { if (active) onResult(result); },
    () => { if (active) onError(); },
  );
  return () => { active = false; };
}
