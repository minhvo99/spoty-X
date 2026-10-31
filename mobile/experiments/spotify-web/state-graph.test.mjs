import { expect, test } from "vitest";
import { bypassKnownAdStates } from "./state-graph.mjs";

function queue() {
  return {
    state_machine: {
      state_machine_id: "fixture-machine",
      tracks: [
        { content_type: "TRACK", metadata: { name: "First song" } },
        { content_type: "AD" },
        { content_type: "TRACK", metadata: { name: "Second song" } },
      ],
      states: [
        {
          state_id: "first",
          track: 0,
          transitions: {
            advance: { state_index: 1 },
            skip_next: { state_index: 1 },
          },
        },
        {
          state_id: "advertisement",
          track: 1,
          transitions: { advance: { state_index: 2 } },
        },
        { state_id: "second", track: 2, transitions: {} },
      ],
    },
    updated_state_ref: { state_id: "first", state_index: 0 },
    unrelated: { keep: true },
  };
}

test("routes forward transitions past an explicitly marked ad while preserving songs and IDs", () => {
  const original = queue();
  const before = structuredClone(original);
  const result = bypassKnownAdStates(original);
  expect(result.changes).toBe(2);
  expect(
    result.payload.state_machine.states[0].transitions.advance.state_index,
  ).toBe(2);
  expect(
    result.payload.state_machine.states[0].transitions.skip_next.state_index,
  ).toBe(2);
  expect(result.payload.state_machine.tracks).toEqual(
    original.state_machine.tracks,
  );
  expect(result.payload.state_machine.states.map((s) => s.state_id)).toEqual(
    before.state_machine.states.map((s) => s.state_id),
  );
  expect(result.payload.unrelated).toBe(original.unrelated);
  expect(original).toEqual(before);
});

test("advances an initial ad reference only to an existing song state", () => {
  const original = queue();
  original.updated_state_ref = { state_id: "advertisement", state_index: 1 };
  const result = bypassKnownAdStates(original);
  expect(result.payload.updated_state_ref).toEqual({
    state_id: "second",
    state_index: 2,
  });
});

test("does not guess when the next state is absent or the ad chain loops", () => {
  for (const next of [99, 1]) {
    const original = queue();
    original.state_machine.states[1].transitions.advance.state_index = next;
    const result = bypassKnownAdStates(original);
    expect(result.payload).toBe(original);
    expect(result.changes).toBe(0);
    expect(result.unresolved).toBeGreaterThan(0);
  }
});

test("does not interpret short music, names or metadata as an advertisement", () => {
  const original = queue();
  original.state_machine.tracks[1] = {
    content_type: "TRACK",
    metadata: { name: "Advertisement", duration: 15000 },
  };
  expect(bypassKnownAdStates(original).payload).toBe(original);
});

test("supports replacement-state socket envelopes without changing unrelated messages", () => {
  const container = queue();
  const message = {
    payloads: [
      { type: "replace_state", ...container },
      { type: "other", value: "preserve" },
    ],
  };
  const result = bypassKnownAdStates(message);
  expect(result.changes).toBe(2);
  expect(
    result.payload.payloads[0].state_machine.states[0].transitions.advance
      .state_index,
  ).toBe(2);
  expect(result.payload.payloads[1]).toBe(message.payloads[1]);
});

test("unknown payloads and oversized graphs pass through without modification", () => {
  for (const original of [
    null,
    [],
    { access_token: "fixture-only" },
    { state_machine: { states: Array(2049).fill({}), tracks: [] } },
  ]) {
    expect(bypassKnownAdStates(original).payload).toBe(original);
  }
});

test("an unresolved ad placeholder can use the current song's explicit next-song transition", () => {
  const original = queue();
  original.state_machine.states[1].transitions = {};
  original.state_machine.states[0].transitions.skip_next.state_index = 2;
  const result = bypassKnownAdStates(original);
  expect(result.changes).toBe(1);
  expect(result.unresolved).toBe(0);
  expect(
    result.payload.state_machine.states[0].transitions.advance.state_index,
  ).toBe(2);
});

test("a fallback pointing back at the same song must not create a replay loop", () => {
  const original = queue();
  original.state_machine.states[1].transitions = {};
  original.state_machine.states[0].transitions.skip_next.state_index = 0;
  const result = bypassKnownAdStates(original);
  expect(result.payload).toBe(original);
  expect(result.changes).toBe(0);
});

test("a direct ad chain returning to the same song must not introduce a new replay loop", () => {
  const original = queue();
  original.state_machine.states[1].transitions.advance.state_index = 0;
  const result = bypassKnownAdStates(original);
  expect(result.payload).toBe(original);
  expect(result.unresolved).toBeGreaterThan(0);
});
