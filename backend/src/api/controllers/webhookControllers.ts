import { Response } from "express";

import { paymentConfig } from "../../config";
import { PAYMENT_PROVIDERS, PaymentProvider } from "../../enums/paymentProviderEnum";
import { AppRequest as Request } from "../../interfaces";
import { asyncHandler } from "../../middleware/exceptionHandler";
import { paymentServices } from "../../services";
import { buildSignedPayload } from "../../services/paymentProviders";
import AppError from "../../utils/appError";
import { sendSuccess } from "../../utils/response";

// ---------------------------------------------------------------------------
// Provider webhooks. The raw body is captured in app.ts (express.json verify)
// so the HMAC signature is checked over the exact bytes the provider signed.
// ---------------------------------------------------------------------------
export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const provider = req.params.provider.toUpperCase() as PaymentProvider;
    if (!PAYMENT_PROVIDERS.includes(provider)) {
        throw AppError.notFound("Unknown payment provider");
    }
    const signature = req.headers["x-elysian-signature"] as string | undefined;

    const outcome = await paymentServices.processProviderCallback({
        provider,
        rawBody: req.rawBody,
        signature,
        body: req.body as Record<string, unknown>,
        ip: req.ip,
    });

    // Always 200 for processed/replayed events so providers stop retrying.
    sendSuccess(res, outcome, outcome.message);
});

// ---------------------------------------------------------------------------
// Mock "hosted checkout" page (dev only): renders a page that POSTs a
// correctly signed SUCCESS callback to /api/webhooks/:provider — the full
// HTTP path, including signature verification, is exercised end to end.
// ---------------------------------------------------------------------------
export const mockCheckout = asyncHandler(async (req: Request, res: Response) => {
    if (!paymentConfig.enableMockPayments) {
        throw AppError.forbidden("Mock payments are disabled on this server");
    }
    const provider = String(req.query.provider ?? "ESEWA").toUpperCase() as PaymentProvider;
    if (!PAYMENT_PROVIDERS.includes(provider)) throw AppError.badRequest("Unknown provider");

    const orderId = req.params.id;
    const amountPaisa = Number(req.query.amount_paisa ?? 0);
    const payload = {
        order_id: orderId,
        transaction_id: `MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        status: "SUCCESS",
        amount_paisa: amountPaisa,
        provider,
    };
    const { rawBody, signature } = buildSignedPayload(payload);

    const html = `<!doctype html><html><head><title>Elysian Mock Checkout</title></head>
<body style="font-family:system-ui;background:#0b0f19;color:#e6e9f0;display:flex;min-height:100vh;align-items:center;justify-content:center">
  <div style="background:#141a29;padding:2rem 2.5rem;border-radius:14px;max-width:420px;text-align:center">
    <h1 style="margin:0 0 .25rem">ELYSIAN</h1>
    <p style="opacity:.7;margin-top:0">Mock ${provider} checkout</p>
    <p>Order <code>${orderId}</code></p>
    <p style="font-size:1.4rem">Rs ${(amountPaisa / 100).toFixed(2)}</p>
    <button id="pay" style="margin-top:1rem;padding:.7rem 2rem;border:0;border-radius:8px;background:#6d5dfc;color:#fff;font-size:1rem;cursor:pointer">Pay now</button>
    <pre id="out" style="text-align:left;background:#0b0f19;padding:1rem;border-radius:8px;margin-top:1rem;display:none"></pre>
  </div>
  <script>
    document.getElementById('pay').addEventListener('click', async () => {
      const res = await fetch('/api/webhooks/${provider}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-elysian-signature': ${JSON.stringify(signature)} },
        body: ${JSON.stringify(rawBody.toString("utf8"))}
      });
      const json = await res.json();
      const out = document.getElementById('out');
      out.style.display = 'block';
      out.textContent = JSON.stringify(json, null, 2);
    });
  </script>
</body></html>`;

    res.type("html").send(html);
});
