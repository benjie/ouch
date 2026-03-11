import "graphile-config";

import { makePgService } from "@dataplan/pg/adaptors/pg";
import AmberPreset from "postgraphile/presets/amber";
import { makeV4Preset } from "postgraphile/presets/v4";
import { pgSmartTagsFromFile } from "postgraphile/utils";
import { PostGraphileConnectionFilterPreset } from "postgraphile-plugin-connection-filter";
import { PgAggregatesPreset } from "@graphile/pg-aggregates";
import { PgManyToManyPreset } from "@graphile-contrib/pg-many-to-many";
// import { PgSimplifyInflectionPreset } from "@graphile/simplify-inflection";
import PersistedPlugin from "@grafserv/persisted";
import { PgOmitArchivedPlugin } from "@graphile-contrib/pg-omit-archived";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { TestPlugin } from "./TestPlugin.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// For configuration file details, see: https://postgraphile.org/postgraphile/next/config

const TagsFilePlugin = pgSmartTagsFromFile(`${__dirname}/tags.json5`);

const preset: GraphileConfig.Preset = {
  extends: [
    AmberPreset.default ?? AmberPreset,
    makeV4Preset({
      /* Enter your V4 options here */
      graphiql: true,
      graphiqlRoute: "/",
    }),
    PostGraphileConnectionFilterPreset,
    PgManyToManyPreset,
    PgAggregatesPreset,
    // PgSimplifyInflectionPreset
  ],
  plugins: [
    PersistedPlugin.default,
    PgOmitArchivedPlugin,
    TagsFilePlugin,
    TestPlugin,
  ],
  pgServices: [
    makePgService({
      // Database connection string:
      connectionString: process.env.DATABASE_URL,
      superuserConnectionString:
        process.env.SUPERUSER_DATABASE_URL ?? process.env.DATABASE_URL,
      // List of schemas to expose:
      schemas: process.env.DATABASE_SCHEMAS?.split(",") ?? ["public"],
      // Enable LISTEN/NOTIFY:
      pubsub: true,
    }),
  ],
  grafserv: {
    host: process.env.HOST,
    port: 5678,
    websockets: true,
    allowUnpersistedOperation: true,
    watch: true,
  },
  grafast: {
    explain: true,
  },
};

export default preset;
