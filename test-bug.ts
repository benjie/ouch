import { PgSubscriber } from "@dataplan/pg/adaptors/pg";
import pg from "pg";

// This script reproduces the conditions for the bug:
// - a subscription is active and waiting for a value
// - the subscriber is killed (e.g. Ctrl+C the server)
// - a {done: true} value makes it back to the subscription

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://localhost:5432/postgres";

async function main() {
  console.log("Creating PgSubscriber...");

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const subscriber = new PgSubscriber(pool);

  console.log("Starting subscription to 'test' topic...");
  const iterator = subscriber.subscribe("test");

  // Start waiting for the next value (this creates a pending promise in queue)
  console.log("Calling next() - this will wait for a value...");
  const nextPromise = iterator.next();
  await new Promise((r) => setTimeout(r, 100));

  // Now release the subscriber while we're still waiting
  // This triggers doFinally() which resolves the pending promise with {done: true}
  console.log("Releasing subscriber while next() is pending...");
  subscriber.release();

  // Check what we got back
  const result = await nextPromise;

  console.log("Received:", JSON.stringify(result, null, 2));

  // The bug: result is {done: false, value: {done: true}} instead of {done: true}
  if (result.done === false && result.value && result.value.done === true) {
    console.log(
      "Bug reproduced! Got nested: {done: false, value: {done: true}}"
    );
    process.exit(1);
  } else if (result.done === true) {
    console.log("Correct behavior, got {done: true}");
    process.exit(0);
  } else {
    console.log("Unexpected result:", JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
