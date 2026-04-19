import express from "express";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "mwow_verify_token";

const sessions = new Map();

function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, {
      step: "welcome",
      data: {}
    });
  }
  return sessions.get(phone);
}

function getReply(session, text) {
  const input = String(text).trim().toLowerCase();

  if (input === "menu" || input === "restart") {
    session.step = "welcome";
    session.data = {};
  }

  switch (session.step) {
    case "welcome":
      session.step = "segment";
      return `Hi 👋 Welcome to MWOW

We help with funeral groceries, catering supply, and livestock — delivered where you need it.

Please tell us who you are:
1. Undertaker
2. Caterer
3. Grocery Club / Stokvel
4. Insurance Company
5. Grocery Cover Member
6. Private Customer
7. Government / Institution`;

    case "segment":
      if (input === "1") {
        session.data.segment = "Undertaker";
        session.step = "undertaker_payment";
        return `How would you like to use MWOW?

1. Pay per order
2. Open an account
3. Use grocery cover / insurance`;
      }

      if (input === "2") {
        session.data.segment = "Caterer";
        session.step = "done";
        return "Thanks. Caterer flow captured.";
      }

      if (input === "3") {
        session.data.segment = "Grocery Club / Stokvel";
        session.step = "done";
        return "Thanks. Stokvel flow captured.";
      }

      if (input === "4") {
        session.data.segment = "Insurance Company";
        session.step = "done";
        return "Thanks. We will escalate this to partnerships.";
      }

      if (input === "5") {
        session.data.segment = "Grocery Cover Member";
        session.step = "done";
        return "Thanks. Please send your Policy Number or ID Number.";
      }

      if (input === "6") {
        session.data.segment = "Private Customer";
        session.step = "done";
        return "Thanks. Please choose a package or send a custom grocery list.";
      }

      if (input === "7") {
        session.data.segment = "Government / Institution";
        session.step = "done";
        return "Thanks. We will escalate this to the enterprise team.";
      }

      return "Please reply with a number from 1 to 7.";

    case "undertaker_payment":
      if (input === "1") {
        session.data.paymentModel = "Cash";
      } else if (input === "2") {
        session.data.paymentModel = "Account";
      } else if (input === "3") {
        session.data.paymentModel = "Benefit";
      } else {
        return "Please reply with 1, 2, or 3.";
      }

      session.step = "done";
      return `Thank you. Registration captured.

Segment: ${session.data.segment}
Payment Model: ${session.data.paymentModel}`;

    case "done":
      return 'You are already in the flow. Type "menu" to restart.';

    default:
      session.step = "welcome";
      return "Type menu to start again.";
  }
}

app.get("/", (_req, res) => {
  res.send("MWOW bot is running");
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/webhook", (req, res) => {
  const entry = req.body?.entry?.[0];
  const changes = entry?.changes?.[0];
  const message = changes?.value?.messages?.[0];

  if (!message) {
    return res.sendStatus(200);
  }

  const from = message.from;
  const text = message.text?.body || "";

  const session = getSession(from);
  const reply = getReply(session, text);

  console.log("Incoming:", { from, text });
  console.log("Reply:", reply);

  return res.status(200).json({
    ok: true,
    from,
    text,
    reply
  });
});

app.post("/test-message", (req, res) => {
  const { phone, text } = req.body;

  if (!phone || !text) {
    return res.status(400).json({
      ok: false,
      error: "phone and text are required"
    });
  }

  const session = getSession(phone);
  const reply = getReply(session, text);

  res.json({
    ok: true,
    phone,
    text,
    reply,
    session
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});