import Stripe from "stripe";

// Stripe's default Node HTTP client uses Node's raw `https` module, which
// has been failing with StripeConnectionError in this project's Vercel
// runtime even after retries (not a transient blip — consistent across
// attempts). Switching to the fetch-based client routes requests through a
// different transport that's generally more reliable on serverless/edge-like
// sandboxes, and is Stripe's own documented mitigation for this exact class
// of issue.
export function getStripeServer(secretKey: string) {
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 3,
    timeout: 20000,
  });
}
