// Nepal-first providers: Stripe/PayPal handle NPR poorly, so the store wires
// eSewa, Khalti, ConnectIPS and IME Pay. Adapters are selected through the
// provider-agnostic PaymentProvider interface (see services/paymentProviders).
export enum PaymentProvider {
    ESEWA = "ESEWA",
    KHALTI = "KHALTI",
    CONNECTIPS = "CONNECTIPS",
    IMEPAY = "IMEPAY",
}

export const PAYMENT_PROVIDERS = Object.values(PaymentProvider);
