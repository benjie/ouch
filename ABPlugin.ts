import { TYPES } from "postgraphile/@dataplan/pg";
import { extendSchema, gql } from "postgraphile/utils";

declare global {
  namespace GraphileConfig {
    interface Plugins {
      ABPlugin: true;
    }
  }
}

export const ABPlugin = extendSchema((build) => {
  const { sql, input } = build;

  const { b } = input.pgRegistry.pgResources;

  return {
    typeDefs: gql`
      extend type A {
        bs: [B!]!
      }
    `,

    plans: {
      A: {
        bs: ($a) => {
          // Now get the profiles based on the participants
          const $bs = b.find();
          const $aId = $a.get("id");

          // Broken code
          $bs.where(
            sql.fragment`${$bs.alias}.id in (
              select b_id from app_public.c where a_id = ${$aId}
            )`
          );

          // Working code
          // $bs.where(
          //   sql.fragment`${$bs.alias}.id in (
          //     select b_id from app_public.c where a_id = ${$bs.placeholder(
          //       $aId,
          //       TYPES.bigint
          //     )}
          //   )`
          // );

          return $bs;
        },
      },
    },
  };
});
