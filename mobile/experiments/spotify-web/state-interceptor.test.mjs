import { expect, test } from "vitest";
import { installStateInterceptor } from "./state-interceptor.mjs";
import { bypassKnownAdStates } from "./state-graph.mjs";
const payload = {
  state_machine: {
    tracks: [
      { content_type: "TRACK" },
      { content_type: "AD" },
      { content_type: "TRACK" },
    ],
    states: [
      { state_id: "a", track: 0, transitions: { advance: { state_index: 1 } } },
      {
        state_id: "ad",
        track: 1,
        transitions: { advance: { state_index: 2 } },
      },
      { state_id: "b", track: 2, transitions: {} },
    ],
  },
};
function realm() {
  class LocalResponse {
    constructor(url, data) {
      this.url = url;
      this.data = data;
    }
    json() {
      return Promise.resolve(this.data);
    }
    text() {
      return Promise.resolve(JSON.stringify(this.data));
    }
  }
  return { Response: LocalResponse };
}
test("only transforms state responses from the actual Spotify playback service", async () => {
  const env = realm();
  const probe = installStateInterceptor(env, bypassKnownAdStates, {
    enabled: true,
  });
  for (const url of [
    "https://spclient.wg.spotify.com/track-playback/v1/devices/device/state",
    "https://gae2-spclient.spotify.com/track-playback/v1/devices/device/state",
  ]) {
    const data = await new env.Response(url, payload).json();
    expect(data.state_machine.states[0].transitions.advance.state_index).toBe(
      2,
    );
  }
  for (const url of [
    "https://spclient.wg.spotify.com/api/token",
    "https://spclient.wg.spotify.com.attacker.test/track-playback/v1/devices/device/state",
    "https://api.spotify.com/v1/me",
  ]) {
    expect(await new env.Response(url, payload).json()).toBe(payload);
  }
  expect(probe.snapshot().changedEdges).toBe(2);
  probe.restore();
});
test("observe mode leaves JSON and text untouched and does not record payload data", async () => {
  const env = realm();
  const probe = installStateInterceptor(env, bypassKnownAdStates);
  const response = new env.Response(
    "https://gae2-spclient.spotify.com/track-playback/v1/devices/device/state",
    payload,
  );
  expect(await response.json()).toBe(payload);
  expect(await response.text()).toBe(JSON.stringify(payload));
  expect(probe.snapshot().adResponses).toBe(2);
  expect(probe.snapshot().changedEdges).toBe(0);
  expect(JSON.stringify(probe.snapshot())).not.toMatch(
    /state_machine|device|state_id/,
  );
  probe.setEnabled(true);
  expect(
    JSON.parse(await response.text()).state_machine.states[0].transitions
      .advance.state_index,
  ).toBe(2);
  probe.restore();
  expect(await response.json()).toBe(payload);
});
test("decoder failures propagate and transformation failures pass through safely", async () => {
  const env = realm();
  const error = new Error("private error");
  const original = env.Response.prototype.json;
  env.Response.prototype.json = function () {
    return this.data === null ? Promise.reject(error) : original.call(this);
  };
  const probe = installStateInterceptor(
    env,
    () => {
      throw error;
    },
    { enabled: true },
  );
  const url =
    "https://gae2-spclient.spotify.com/track-playback/v1/devices/device/state";
  await expect(new env.Response(url, null).json()).rejects.toBe(error);
  expect(await new env.Response(url, payload).json()).toBe(payload);
  expect(probe.snapshot().errors).toBe(1);
  expect(JSON.stringify(probe.snapshot())).not.toContain("private error");
  probe.restore();
});
