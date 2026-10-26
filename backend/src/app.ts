import express, { Request } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "node:path";

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

// Serve static files from the "public" folder in the backend root.
// This makes backend/public/Eternal.jpg available at http://localhost:PORT/Eternal.jpg
app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/", (_req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Elysian</title>
        <style>
          *, *::before, *::after { box-sizing: border-box; }

          body {
            margin: 0;
            min-height: 100vh;
            /* 
              1. The image is full screen and vibrant.
              2. A subtle, soft spotlight darkens only the center behind the text.
              3. The edges of the image remain completely untouched.
            */
            background: 
              radial-gradient(ellipse at center, rgba(10, 15, 30, 0.7) 0%, rgba(10, 15, 30, 0.3) 50%, rgba(10, 15, 30, 0.1) 100%),
              url("/Eternal.jpg") center / cover no-repeat fixed;
            color: #ffffff;
            font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          /* No background, no borders. Just the content floating on the art. */
          main {
            max-width: 44rem;
            text-align: center;
            animation: fadeIn 1.2s cubic-bezier(0.2, 0.8, 0.2, 1);
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(15px); filter: blur(4px); }
            to { opacity: 1; transform: translateY(0); filter: blur(0); }
          }

          h1 {
            font-size: clamp(3.5rem, 10vw, 6rem);
            font-weight: 800;
            letter-spacing: -0.04em;
            margin: 0 0 0.5rem;
            /* Deep shadow to separate the white text from the bright moon/wings */
            text-shadow: 0 4px 24px rgba(0, 0, 0, 0.8), 0 1px 2px rgba(0, 0, 0, 0.9);
          }

          .tagline {
            font-size: clamp(1.2rem, 3vw, 1.5rem);
            font-weight: 400;
            color: #e2e8f0;
            margin: 0 0 2.5rem;
            letter-spacing: 0.01em;
            text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
          }

          .description {
            font-size: 1.125rem;
            line-height: 1.8;
            color: #f1f5f9;
            margin: 0 auto 3.5rem;
            max-width: 36rem;
            font-weight: 400;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
            opacity: 0.9;
          }

          /* Elegant, integrated links */
          nav {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 1.5rem;
            font-size: 1rem;
            font-weight: 500;
          }

          nav a {
            color: #ffffff;
            text-decoration: none;
            padding-bottom: 0.25rem;
            position: relative;
            text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
            transition: color 0.2s ease;
          }

          /* A refined animated underline instead of heavy buttons */
          nav a::after {
            content: '';
            position: absolute;
            width: 100%;
            transform: scaleX(0);
            height: 2px;
            bottom: 0;
            left: 0;
            background-color: #ffffff;
            transform-origin: bottom right;
            transition: transform 0.25s ease-out;
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
          }

          nav a:hover::after,
          nav a:focus-visible::after {
            transform: scaleX(1);
            transform-origin: bottom left;
          }

          nav a:focus-visible {
            outline: none;
          }

          @media (prefers-reduced-motion: reduce) {
            main { animation: none; }
            nav a::after { transition: none; }
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Elysian</h1>
          <p class="tagline">PC games, keys, and libraries in one place.</p>
          <p class="description">
            Browse the store, pay, and the key lands in your library instantly. No launcher
            required, no confirmation emails to dig through, no codes to copy by hand.
          </p>
          <nav>
            <a href="/api-docs">Documentation</a>
            <a href="/api/health">Status</a>
          </nav>
        </main>
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