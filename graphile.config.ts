import "graphile-config";

import { makePgService } from "@dataplan/pg/adaptors/pg";
import AmberPreset from "postgraphile/presets/amber";
import { makeV4Preset } from "postgraphile/presets/v4";
import {
  extendSchema,
  makePgSmartTagsFromFilePlugin,
  wrapPlans,
} from "postgraphile/utils";
import type { Step } from "postgraphile/grafast";
import type {
  PgInsertSingleStep,
  PgUpdateSingleStep,
} from "postgraphile/@dataplan/pg";
import { PostGraphileConnectionFilterPreset } from "postgraphile-plugin-connection-filter";
import { PgAggregatesPreset } from "@graphile/pg-aggregates";
import { PgManyToManyPreset } from "@graphile-contrib/pg-many-to-many";
// import { PgSimplifyInflectionPreset } from "@graphile/simplify-inflection";
import PersistedPlugin from "@grafserv/persisted";
import { PgOmitArchivedPlugin } from "@graphile-contrib/pg-omit-archived";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// For configuration file details, see: https://postgraphile.org/postgraphile/next/config

const TagsFilePlugin = makePgSmartTagsFromFilePlugin(`${__dirname}/tags.json5`);

const SystemCredentialCryptoPreset: GraphileConfig.Preset = {
  plugins: [
    extendSchema((build) => {
      const {
        grafast: { lambda, constant },
      } = build;
      return {
        typeDefs: /* GraphQL */ `
          extend input SystemCredentialInput {
            value: String
          }
          extend input SystemCredentialPatch {
            value: String
          }
          extend type SystemCredential {
            value: String
          }
        `,
        objects: {
          SystemCredential: {
            plans: {
              value($sysCred) {
                const $secret = constant("SECRET"); // Pull from wherever makes sense
                const $encrypted = $sysCred.get("value") as Step<string>;
                return lambda([$encrypted, $secret], decrypt);
              },
            },
          },
        },
      };
    }, "SystemCredentialCryptoPlugin"),
    wrapPlans(
      (context, build, field) => {
        if (
          context.scope.pgFieldResource?.name === "system_credentials" &&
          (context.scope.isPgCreateMutation || context.scope.isPgUpdateMutation)
        ) {
          return {
            grafast: build.grafast,
            isPatch: context.scope.isPgUpdateMutation,
          };
        }
        return null;
      },
      (match) => (plan, _, fieldArgs) => {
        const {
          grafast: { constant, lambda },
          isPatch,
        } = match;

        const $secret = constant("SECRET"); // Pull from wherever makes sense

        const $value = fieldArgs.getRaw([
          "input",
          isPatch ? "systemCredentialPatch" : "systemCredential",
          "value",
        ]);
        const $encrypted = lambda([$value, $secret], encrypt);
        const $payload = plan();
        const $insert = $payload.get("result") as
          | PgInsertSingleStep
          | PgUpdateSingleStep;
        $insert.set("value", $encrypted);
        return $payload;
      }
    ),
  ],
};

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";

const scryptAsync = (secret: string, salt: string, size: number) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(secret, salt, size, (err, data) =>
      err ? reject(err) : resolve(data)
    )
  );

const salt = "salt"; // TODO

async function encrypt([value, secret]: readonly [
  string,
  string
]): Promise<string> {
  const iv = randomBytes(16);
  const key = await scryptAsync(secret, salt, 32);
  const cipher = createCipheriv("aes-256-ctr", key, iv, {});
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

async function decrypt([payload, secret]: readonly [
  string,
  string
]): Promise<string> {
  const [ivHex, dataHex] = payload.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");
  const key = await scryptAsync(secret, salt, 32);
  const decipher = createDecipheriv("aes-256-ctr", key, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

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
    SystemCredentialCryptoPreset,
  ],
  plugins: [PersistedPlugin.default, PgOmitArchivedPlugin, TagsFilePlugin],
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
