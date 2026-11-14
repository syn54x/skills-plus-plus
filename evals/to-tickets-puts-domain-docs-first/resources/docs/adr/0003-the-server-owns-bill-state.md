# The server owns bill state

Payments live on the server, and the web app could have worked out each Occurrence's state from a copy of them. We keep Bill series and payments on the server alone, so the state has one source; a local copy lost because two devices would disagree after a payment.
