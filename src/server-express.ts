import express from "express";
import { grafserv } from "postgraphile/grafserv/express/v4";
import { postgraphile } from "postgraphile";
import preset from "./graphile.config.ts";
import { test } from "./test.ts";

// Create an express app
const app = express();

// Create a PostGraphile instance
const pgl = postgraphile(preset);
// And extract the resolved preset
const resolvedPreset = pgl.getResolvedPreset();

// Create a Grafserv instance using the grafserv/express/v4 adaptor
const serv = pgl.createServ(grafserv);

// Start the Express server
const port = resolvedPreset.grafserv?.port ?? 5678;
const host = resolvedPreset.grafserv?.host ?? "127.0.0.1";
const server = app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}/`);
});

// Mount our Grafserv instance into our Express app, passing the HTTP server so
// we can attach websocket support.
serv.addTo(app, server);

test(await serv.getSchema(), serv.getPreset());
