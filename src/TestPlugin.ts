import type { PgSelectStep } from "postgraphile/@dataplan/pg";
import { extendSchema, gql } from "postgraphile/utils";

export const TestPlugin = extendSchema((build) => ({
  typeDefs: gql`
    extend type Query {
      test(search: String!): [TestEntity]!
    }
  `,
  objects: {
    Query: {
      plans: {
        test: {
          plan: (_$root, fieldArgs) => {
            const $select =
              build.input.pgRegistry.pgResources.test_entity.find();
            console.log("BEFORE_APPLY========================");
            fieldArgs.apply($select);
            console.log("AFTER_APPLY========================");
            return $select;
          },
          args: {
            search: ($root: PgSelectStep, value) => {
              console.log("search========================");
              console.log(value);
              console.log("search========================");
              return $root;
            },
          },
        },
      },
    },
  },
}));
