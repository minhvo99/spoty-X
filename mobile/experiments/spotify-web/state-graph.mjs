// Experimental client-side queue transformation. Not used by the Pages app.
export function bypassKnownAdStates(payload) {
  const unchanged = (value, unresolved = 0) => ({
    payload: value,
    changes: 0,
    unresolved,
  });
  const transformContainer = (container) => {
    const machine = container?.state_machine;
    if (
      !machine ||
      !Array.isArray(machine.states) ||
      !Array.isArray(machine.tracks) ||
      machine.states.length > 2048 ||
      machine.tracks.length > 1024
    )
      return unchanged(container);
    const { states, tracks } = machine;
    const typeAt = (index) => {
      if (!Number.isInteger(index) || index < 0 || index >= states.length)
        return null;
      const track = states[index]?.track;
      return Number.isInteger(track) && track >= 0 && track < tracks.length
        ? tracks[track]?.content_type
        : null;
    };
    if (!states.some((_, i) => typeAt(i) === "AD")) return unchanged(container);
    const resolveSong = (start) => {
      const seen = new Set();
      let index = start;
      while (typeAt(index) === "AD" && !seen.has(index)) {
        seen.add(index);
        index = states[index]?.transitions?.advance?.state_index;
      }
      return typeAt(index) === "TRACK" ? index : null;
    };
    let changes = 0,
      unresolved = 0;
    const nextStates = states.map((state) => {
      if (!state?.transitions) return state;
      let transitions = state.transitions;
      for (const key of ["advance", "skip_next", "show_next"]) {
        const transition = transitions[key];
        if (typeAt(transition?.state_index) !== "AD") continue;
        let destination = resolveSong(transition.state_index);
        // A live response used a terminal AD placeholder while the current
        // song still supplied an explicit skip_next edge to the next song.
        // Use only that declared alternative, never an array-order guess.
        if (destination === null && key !== "skip_next") {
          const alternative = state.transitions.skip_next?.state_index;
          if (
            typeAt(alternative) === "TRACK" &&
            states[alternative].track !== state.track
          ) {
            destination = alternative;
          }
        }
        if (
          destination === null ||
          (tracks[state.track]?.content_type === "TRACK" &&
            states[destination].track === state.track)
        ) {
          unresolved++;
          continue;
        }
        transitions = {
          ...transitions,
          [key]: { ...transition, state_index: destination },
        };
        changes++;
      }
      return transitions === state.transitions
        ? state
        : { ...state, transitions };
    });
    const references = {};
    for (const key of ["state_ref", "updated_state_ref"]) {
      const ref = container[key];
      if (!ref || typeof ref !== "object") continue;
      const index = Number.isInteger(ref.state_index)
        ? ref.state_index
        : typeof ref.state_id === "string"
          ? states.findIndex((s) => s?.state_id === ref.state_id)
          : -1;
      if (typeAt(index) !== "AD") continue;
      if (
        ref.state_id !== undefined &&
        ref.state_id !== states[index]?.state_id
      ) {
        unresolved++;
        continue;
      }
      const destination = resolveSong(index);
      if (destination === null) {
        unresolved++;
        continue;
      }
      const nextRef = { ...ref };
      if ("state_index" in ref) nextRef.state_index = destination;
      if ("state_id" in ref) nextRef.state_id = states[destination].state_id;
      references[key] = nextRef;
      changes++;
    }
    // Incomplete and cyclic graphs must pass through rather than stall music.
    if (unresolved || !changes) return unchanged(container, unresolved);
    return {
      payload: {
        ...container,
        ...references,
        state_machine: { ...machine, states: nextStates },
      },
      changes,
      unresolved: 0,
    };
  };
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return unchanged(payload);
  const direct = transformContainer(payload);
  if (!Array.isArray(payload.payloads) || payload.payloads.length > 128)
    return direct;
  let changes = direct.changes,
    unresolved = direct.unresolved;
  const nested = payload.payloads.map((item) => {
    if (item?.type !== "replace_state") return item;
    const result = transformContainer(item);
    changes += result.changes;
    unresolved += result.unresolved;
    return result.payload;
  });
  return changes
    ? { payload: { ...direct.payload, payloads: nested }, changes, unresolved }
    : unchanged(payload, unresolved);
}
