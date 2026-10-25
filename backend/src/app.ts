import express, { Request } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import router from "./api/routes";
import { corsOptions } from "./config";
import { errorHandler, globalLimiter, notFoundHandler } from "./middleware";
import { swaggerSpec, swaggerUi } from "./swagger/swagger";

const app = express();

app.use(
    helmet({
        // Two HTML documents are served by this API (the landing page below and
        // the dev-only mock checkout page in webhookControllers), and the mock
        // checkout drives its "Pay" button from an inline <script>. The strict
        // default script-src would block it.
        contentSecurityPolicy: {
            directives: { "script-src": ["'self'", "'unsafe-inline'"] },
        },
    }),
);
app.use(cors(corsOptions));
app.use(morgan("dev"));

// Webhook HMAC verification runs over the exact bytes the provider signed, so
// express.json parses the body while `verify` stashes the untouched buffer on
// req.rawBody first (see webhookControllers.handleWebhook → paymentServices).
// Route ordering follows: JSON is available everywhere, rawBody survives parsing.
app.use(
    express.json({
        verify: (req, _res, buf) => {
            (req as Request).rawBody = buf;
        },
    }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (_req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ElysianGameStore</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #0b0f19;
            color: #e6e9f0;
            font-family: Georgia, serif;
            text-align: center;
          }
          h1 { font-size: 3rem; margin: 0 0 0.5rem; }
          p { font-size: 1.15rem; color: #94a3b8; margin: 0.35rem 0; }
          a { color: #6d5dfc; }
        </style>
      </head>
      <body>
        <h1>Elysian</h1>
        <p>PC games, keys and library — integer paisa, no rounding surprises.</p>
        <p><a href="/api-docs">API documentation</a> · <a href="/api/health">health</a></p>
      </body>
    </html>
  `);
});

// Per-IP global budget first, then the domain routes, then the docs. A 404
// outside the envelope comes back as { success: false, message } from
// notFoundHandler, and every failure funnels through errorHandler.
app.use("/api", globalLimiter);
app.use("/api", router);

// Interactive API documentation (Swagger UI). The raw OpenAPI document is
// served at /api-docs.json; the browsable UI lives at /api-docs.
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (_req, res) => {
    res.json(swaggerSpec);
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
