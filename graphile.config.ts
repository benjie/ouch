import "graphile-config";

import { makePgService } from "@dataplan/pg/adaptors/pg";
import { jsonParse } from "@dataplan/json";
import { extendSchema, gql } from "graphile-utils";
import { context, listen, object } from "postgraphile/grafast";
import AmberPreset from "postgraphile/presets/amber";

const BugReproPlugin = extendSchema(() => ({
  typeDefs: gql`
    type TestSubPayload {
      payload: JSON
    }
    extend type Subscription {
      testSub(topic: String!): TestSubPayload
    }
  `,
  plans: {
    Subscription: {
      testSub: {
        subscribePlan(_$root, args) {
          const $topic = args.getRaw("topic");
          const $pgSubscriber = context().get("pgSubscriber");
          return listen($pgSubscriber, $topic, ($payload) =>
            jsonParse($payload)
          );
        },
        plan($payload) {
          return object({ payload: $payload });
        },
      },
    },
  },
}));

const preset: GraphileConfig.Preset = {
  extends: [AmberPreset.default],
  plugins: [BugReproPlugin],
  pgServices: [
    makePgService({
      connectionString: process.env.DATABASE_URL,
      schemas: ["public"],
      pubsub: true,
    }),
  ],
  grafserv: {
    port: 5678,
    websockets: true,
  },
};

export default preset;
