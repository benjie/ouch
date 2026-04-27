import { grafast } from "postgraphile/grafast";
import type { GraphQLSchema } from "postgraphile/graphql";

/**
 * Should print "column __relational_topics__.deleted_at does not exist" error
 * @param schema
 * @param resolvedPreset
 */
export async function test(
  schema: GraphQLSchema,
  resolvedPreset: GraphileConfig.ResolvedPreset
) {
  const result = await grafast({
    schema,
    source: `query MyQuery {
  allRelationalTopics {
    nodes {
      title
    }
  }
}`,
    rootValue: null,
    contextValue: {},
    variableValues: {},
    operationName: null,
    resolvedPreset,
    requestContext: {},
  });
  if (Symbol.asyncIterator in result) {
    console.log("Async iterator result");
  } else if (result.errors) {
    console.error(result.errors);
  } else {
    console.log("Success");
  }
}
