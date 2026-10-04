export interface SseMessage {
  event: string;
  data: unknown;
}

/** Incremental SSE parser: network chunks can split an event anywhere, so buffer until a blank line. */
export function createSseParser(onMessage: (message: SseMessage) => void) {
  let buffer = "";

  function flushBlock(block: string) {
    let event = "message";
    const data: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    }
    if (data.length === 0) return;
    try {
      onMessage({ event, data: JSON.parse(data.join("\n")) });
    } catch {
      /* ignore malformed events */
    }
  }

  return {
    push(chunk: string) {
      buffer += chunk.replace(/\r\n/g, "\n");
      let end = buffer.indexOf("\n\n");
      while (end !== -1) {
        flushBlock(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        end = buffer.indexOf("\n\n");
      }
    },
  };
}
