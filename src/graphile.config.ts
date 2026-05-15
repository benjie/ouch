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
import {
  PgOmitArchivedPlugin,
  custom as customPgOmitArchived,
} from "@graphile-contrib/pg-omit-archived";
import { dirname } from "path";
import { fileURLToPath } from "url";
import type { PgSQL, SQL } from "postgraphile/pg-sql2";

declare global {
  namespace GraphileBuild {
    interface SchemaOptions {
      /**
       * The name of the column to use to determine if the record is archived
       * or not. Defaults to 'is_archived'
       */
      pgDeletedColumnName?: string;
      /**
       * Set this true to invert the column logic - i.e. if your column is
       * `is_visible` instead of `is_archived`.
       */
      pgDeletedColumnImpliesVisible?: boolean;
      /**
       * If your determination of whether a record is archived or not is more complex
       * than checking if a column is not null/not false then you can define an SQL
       * expression instead.
       */
      pgDeletedExpression?: (sql: PgSQL, tableAlias: SQL) => SQL;
      /**
       * The default option to use for the 'includeDeleted' argument. Defaults
       * to 'NO', but will be replaced with 'INHERIT' where possible unless you set
       * `pgDeletedDefaultInherit` to false.
       */
      pgDeletedDefault?: "INHERIT" | "NO" | "YES" | "EXCLUSIVELY";
      /**
       * Set false if you don't want the system to default to 'INHERIT' if it's
       * able to do so.
       */
      pgDeletedDefaultInherit?: boolean;
      /**
       * Set true if you want related record collections to have the
       * pg-omit-archived behavior if they belong to a table that explicitly
       * matches.
       */
      pgDeletedRelations?: boolean;
      /**
       * If you want the system to apply the archived filter to a specific list of tables, list their names here:
       */
      pgDeletedTables?: string[];
    }
  }
}

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
    customPgOmitArchived("deleted"),
    TagsFilePlugin,
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
  schema: {
    pgDeletedColumnName: "deleted_at",
    pgDeletedColumnImpliesVisible: false,
    pgDeletedRelations: false,
    pgDeletedDefaultInherit: true,
    pgDeletedDefault: "NO",
    pgDeletedTables: [],
  },
};

export default preset;
