import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSseParser, type SseMessage } from "./sse";

function collect(chunks: string[]): SseMessage[] {
  const out: SseMessage[] = [];
  const parser = createSseParser((message) => out.push(message));
  for (const chunk of chunks) parser.push(chunk);
  return out;
}

describe("createSseParser", () => {
  it("parses whole events", () => {
    const out = collect([
      'event: session\ndata: {"sessionId":"s1","title":"Hi"}\n\nevent: delta\ndata: {"text":"Hello"}\n\n',
    ]);
    assert.deepEqual(out, [
      { event: "session", data: { sessionId: "s1", title: "Hi" } },
      { event: "delta", data: { text: "Hello" } },
    ]);
  });

  it("joins events split across chunks, including inside multibyte text", () => {
    const out = collect(["event: del", 'ta\ndata: {"text":"नम', 'स्ते"}\n', "\n"]);
    assert.deepEqual(out, [{ event: "delta", data: { text: "नमस्ते" } }]);
  });

  it("holds an unfinished event until its blank line arrives", () => {
    assert.deepEqual(collect(['event: done\ndata: {"messageId":"m1"}\n']), []);
  });

  it("handles CRLF and skips malformed data", () => {
    const out = collect(["event: delta\r\ndata: nope\r\n\r\nevent: done\r\ndata: {}\r\n\r\n"]);
    assert.deepEqual(out, [{ event: "done", data: {} }]);
  });
});
