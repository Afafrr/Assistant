# 🧠 AI Voice Assistant SaaS

This project is an MVP of an AI-powered voice assistant.

The system answers phone calls, collects customer orders using AI, and sends them via SMS to the yard owner.

---

# 🚀 Scope

The goal is to build the simplest working system:

```
Customer calls → AI talks → order collected → SMS sent
```

No multi-tenancy, no billing, no dashboard (yet).

---

# 🏗️ Tech Stack

* **Telephony:** Telnyx
* **AI Voice:** VAPI
* **Backend:** Node.js (Express)
* **Validation:** Zod
* **SMS:** SMSAPI
* **Local Dev:** ngrok

---

# 📁 Project Structure

```
src/
  index.ts
  routes/
    telnyx.ts
    tools.ts
  services/
    sms.ts
  utils/
```

---

# ⚙️ Setup

## 1. Install dependencies

```
npm install
```

## 2. Run dev server

```
npx ts-node-dev src/index.ts
```

Server runs on:

```
http://localhost:3000
```

---

## 3. Expose server (required for Telnyx + VAPI)

```
npx ngrok http 3000
```

Copy the HTTPS URL and use it in:

* Telnyx webhook config
* VAPI tool config

---

# ☎️ Telnyx Webhook

## Endpoint

```
POST /webhooks/telnyx
```

## Behavior

* Receives incoming call events
* Logs event
* Responds immediately (`200 OK`)
* Later will route call to VAPI

## Example

```ts
export const telnyxWebhook = async (req, res) => {
  const event = req.body;

  console.log("TELNYX EVENT:", event.data?.event_type);

  res.sendStatus(200);
};
```

---

# 🤖 VAPI Assistant

## Prompt

```
You are a coal order assistant.

Collect:
- name
- coal type
- quantity (tons)
- delivery address
- phone number

When you have all data, call the create_order tool.
```

---

# 🔧 AI Tool: Create Order

## Endpoint

```
POST /api/tools/create-order
```

## Schema

```json
{
  "name": "string",
  "coalType": "string",
  "quantity": "number",
  "address": "string",
  "phone": "string"
}
```

---

## Example Implementation

```ts
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  coalType: z.string(),
  quantity: z.number(),
  address: z.string(),
  phone: z.string(),
});

export const createOrder = async (req, res) => {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const order = parsed.data;

  console.log("ORDER:", order);

  await sendSMS(
    process.env.OWNER_PHONE,
    `New order:
${order.coalType}
${order.quantity} tons
${order.address}
${order.phone}`
  );

  return res.json({ success: true });
};
```

---

# 📩 SMS Integration (SMSAPI)

## Service

```ts
import axios from "axios";

export const sendSMS = async (to, message) => {
  await axios.post("https://api.smsapi.pl/sms.do", null, {
    params: {
      to,
      message,
      format: "json",
    },
    headers: {
      Authorization: `Bearer ${process.env.SMSAPI_TOKEN}`,
    },
  });
};
```

---

# 🔐 Environment Variables

Create `.env`:

```
PORT=3000
SMSAPI_TOKEN=your_smsapi_token
OWNER_PHONE=48123123123
TELNYX_API_KEY=your_telnyx_key
```

---

# 🧪 Testing the MVP

## 1. Start backend

## 2. Start ngrok

## 3. Configure Telnyx webhook

## 4. Configure VAPI tool

## 5. Call your number

Say:

> "I want 2 tons of eco pea coal delivered to Warsaw..."

---

## Expected Result

* AI asks questions
* AI calls `create_order`
* Backend logs order
* SMS is sent to owner

---

# ⚠️ Known Limitations (MVP)

* No database (orders are not persisted)
* No multi-tenancy
* No authentication
* No retries / idempotency
* No call tracking

---

# 🧭 Next Steps

After MVP works:

1. Add PostgreSQL (Neon)
2. Add `tenants` table
3. Add `orders` persistence
4. Track calls + usage
5. Add call transfer to owner
6. Add subscription limits

---

# 🧠 Development Notes

* Always respond quickly to Telnyx webhooks
* Validate all AI input (never trust blindly)
* Keep AI prompt simple and strict
* Log everything during development

---

# 🎯 Goal

Get **one real phone call working end-to-end**.

That is your first milestone.

---
