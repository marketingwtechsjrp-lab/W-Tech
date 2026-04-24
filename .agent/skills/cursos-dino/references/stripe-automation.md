# Stripe Automation for Cursos-Dino

This guide covers automating Stripe payments for the Dino Course Engine.

## 1. Product/Price Sync Logic
For every newly created course in the database, a corresponding Stripe Product and Price should be created if it doesn't exist.

```javascript
// Pseudo-code for Sync
async function syncStripeProduct(course) {
  const product = await stripe.products.create({
    name: course.title,
    description: course.description,
    metadata: { course_id: course.id }
  });
  
  const price = await stripe.prices.create({
    unit_amount: course.base_price * 100, // Cents
    currency: course.currency,
    product: product.id,
  });
  
  return { stripeProductId: product.id, stripePriceId: price.id };
}
```

## 2. Checkout Flow
When a student clicks "Inscrever-se", create a Checkout Session.

**Required Metadata**:
- `enrollmentId`: The ID of the pending enrollment in our DB.
- `courseDateId`: Reference to the specific date.

## 3. Webhook Handling (`checkout.session.completed`)
1. **Verify Signature**: Mandatory for security.
2. **Retrieve Metadata**: Extract `enrollmentId`.
3. **Update Database**:
   - Set `enrollments.status = 'Confirmed'`.
   - Set `enrollments.amount_paid = session.amount_total / 100`.
   - Increment `course_dates.enrolled_count`.
4. **Log Transaction**: Insert record into `transactions` table with Stripe Session ID.

## 4. Multi-Currency
If the `course_dates` location is in Europe (e.g., Lisboa), ensure the checkout session uses `EUR`. Dino Engine handles currency conversion logic if the base price is in `BRL`.

- **Portuguese Gateway**: Use Stripe for Cards and EU-specific methods (Klarna/SEPA) if needed.
- **Brazilian Gateway**: Use Stripe for Cards and Pix.
