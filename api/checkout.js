// api/checkout.js
import Stripe from "stripe";

/* ===================== CORS (abierto) ===================== */
const setCORS = (req, res) => {
  // devuelve el origen que hace la petición o '*' (para salir del paso)
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
};
/* ========================================================== */

export default async function handler(req, res) {
  setCORS(req, res);

  // MUY IMPORTANTE: responder el preflight con 200 y headers
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Asegurar parseo del body
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  } else if (!body) {
    body = {};
  }

  try {
    const { cart } = body;
    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Cart empty" });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Normaliza dominio base para Stripe (modo test solo acepta http://localhost)
    const originRaw = (process.env.DOMAIN || req.headers.origin || "http://localhost:5500").trim();
    const origin = originRaw.replace(/\/$/, "").replace("127.0.0.1", "localhost");

    const success_url = `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url  = `${origin}/`;

    // Valida URLs antes de llamar a Stripe
    try { new URL(success_url); new URL(cancel_url); }
    catch {
      return res.status(400).json({ error: "Bad URL", origin, success_url, cancel_url });
    }

    // Convierte carrito
    const line_items = cart.map(it => ({
      price_data: {
        currency: "mxn",
        unit_amount: Math.round(Number(it.price) * 100),
        product_data: { name: `${it.name}${it.option ? " · " + it.option : ""}` }
      },
      quantity: Number(it.qty || 1)
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "es-419",
      billing_address_collection: "auto",
      line_items,
      success_url,
      cancel_url
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
