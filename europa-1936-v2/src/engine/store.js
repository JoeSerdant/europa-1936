// Minimální store (bez knihoven): getState / setState / update / subscribe.
// Kompatibilní s React.useSyncExternalStore. Funkce nepoužívají `this`, lze je předávat samostatně.

export function createStore(initial) {
  let state = initial;
  const listeners = new Set();

  const getState = () => state;

  const setState = (next) => {
    if (Object.is(next, state)) return;
    state = next;
    listeners.forEach((l) => l());
  };

  /** store.update(togglePause) | store.update(setSpeed, 3) */
  const update = (fn, ...args) => setState(fn(state, ...args));

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return { getState, setState, update, subscribe };
}
