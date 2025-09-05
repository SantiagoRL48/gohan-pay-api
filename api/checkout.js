import Stripe from "stripe";

// --- CORS ---
const getAllowed = () =>
  (process.env.ALLOWED_ORIGINS || "")
    .split(",").map(s => s.trim()).filter(Boolean);

const setCORS = (req, res) => {
  const allowed = getAllowed();
  const origin = req.headers.origin || "";
  if (!allowed.length || allowed.includes("*") || allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

export default async function handler(req, res) {
  setCORS(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

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

    // Normaliza el dominio base
    const originRaw = (process.env.DOMAIN || req.headers.origin || "http://localhost:5500").trim();
    // Forzar localhost (Stripe test acepta http solo si es localhost)
    const origin = originRaw.replace(/\/$/, "").replace("127.0.0.1", "localhost");

    const success_url = `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url  = `${origin}/`;

    // Valida URLs (si fallan te mandamos el detalle)
    try { new URL(success_url); new URL(cancel_url); }
    catch (e) {
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

    res.status(200).json({ url: session.url, success_url, cancel_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

}
