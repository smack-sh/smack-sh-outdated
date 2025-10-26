
import { ActionFunctionArgs } from '@remix-run/cloudflare';
import { loadStripe } from '@stripe/stripe-js';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export const action = async ({ request }: ActionFunctionArgs) => {
  const { priceId } = await request.json();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${request.headers.get('origin')}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${request.headers.get('origin')}/cancel`,
  });

  return { sessionId: session.id };
};
