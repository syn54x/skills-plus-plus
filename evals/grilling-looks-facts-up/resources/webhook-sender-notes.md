# Webhook sender notes

- Delivery timeout: 30 seconds per attempt.
- Retries today: none. A failed delivery is dropped and logged.
- Queue: deliveries are sent from an in-process queue, so a restart loses anything unsent.
- Consumers: three internal services and two paying customers receive these webhooks.
