# Pixel Pivot Hosting Platform — Feature Map (MVP-first)

Source spec: `E:\My File\Projects\Files\Pixel-Pivot-Hosting.txt`

## Phase 1 — MVP (manual payments)
- [ ] Public pages: Home, Hosting, Domains, Pricing, Contact
- [ ] Packages: list + details
- [ ] Auth: register, login, logout
- [ ] Email verification (OTP-style) for new accounts (dev: logs code to server console)
- [ ] Customer dashboard: orders, payments, profile
- [ ] Order flow: create order → invoice → payment submit (manual trx id)
- [ ] Admin panel: packages CRUD, orders approve/reject, payments verify/approve/reject
- [ ] Admin settings: bKash/Nagad/Rocket numbers shown on payment page

## Phase 2 — Improvements
- [ ] Forgot password + reset flow
- [ ] Ticket support module
- [ ] Notifications: email for order/payment status (SMTP)
- [ ] Rate limiting + audit logs (stronger persistence than memory)

## Phase 3 — Automation
- [ ] Payment gateway integrations (SSLCommerz/ShurjoPay/bKash gateway)
- [ ] Domain availability integration + suggestions
- [ ] Hosting provisioning automation

