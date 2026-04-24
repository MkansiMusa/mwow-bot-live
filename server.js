import express from "express";
import fs from "fs";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// 🔐 Replace this with your NEW Meta token
const WHATSAPP_TOKEN = "EAASc8kzaFdsBRVGSqZA7x7jCsuJ65qvEQiHEmGcH47MBsORb6wAX6xE0cqvZAzGmFfhHwjx0DP9W3NZBZAHICgbpBs40dWvjWRSFJEvZA3eZCYT4fZAQMZAJusSka83C9VoZAVvwwMBEzChslea4F483xuf7cNfLsZADiKgTXPgv1JcbuHqLrXAsWdbzNtdVgBQpJzIkgJdDbMyS5ZCKvzRyH2aFXZBlEXPY4dkQ7MFweZBLqNJCQBtyTtadSTycSxLNObgH6HrekBmSIzeRxB6MfGaOh";

// Your Meta Phone Number ID
const PHONE_NUMBER_ID = "1137567609433652";

// Must match Meta webhook verify token
const VERIFY_TOKEN = "mwow_verify_token";

const sessions = new Map();
const LEADS_FILE = "./leads.json";

function loadLeads() {
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, JSON.stringify([], null, 2));
  }
  return JSON.parse(fs.readFileSync(LEADS_FILE, "utf8"));
}

function saveLeads(leads) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
}

function saveLead(data) {
  const leads = loadLeads();

  const exists = leads.find(
    (lead) => lead.phone === data.phone && lead.segment === data.segment
  );

  if (!exists) {
    const newLead = {
      ...data,
      savedAt: new Date().toISOString()
    };

    leads.push(newLead);
    saveLeads(leads);
    console.log("New lead saved:", newLead);
  }
}

function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, {
      step: "welcome",
      data: {}
    });
  }

  return sessions.get(phone);
}

function resetSession(session) {
  session.step = "welcome";
  session.data = {};
}

function welcomeMessage() {
  return `Hi 👋 Welcome to MWOW

We help with funeral groceries, catering supply, and livestock — delivered where you need it.

Please tell us who you are:

1. Undertaker
2. Caterer
3. Grocery Club / Stokvel
4. Insurance Company
5. Grocery Cover Member
6. Private Customer
7. Government / Institution

Reply with a number to continue.
Type MENU anytime to restart.`;
}

function getReply(session, text, phone) {
  const input = String(text || "").trim().toLowerCase();

  if (input === "menu" || input === "restart" || input === "start") {
    resetSession(session);
    session.step = "segment";
    return welcomeMessage();
  }

  switch (session.step) {
    case "welcome":
      session.step = "segment";
      return welcomeMessage();

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
        session.step = "caterer_payment";
        return `We support caterers with bulk groceries and meat supply.

How would you like to proceed?

1. Pay per order
2. Open account for regular supply`;
      }

      if (input === "3") {
        session.data.segment = "Grocery Club / Stokvel";
        session.step = "stokvel_type";
        return `We help grocery clubs and stokvels buy in bulk and deliver conveniently.

How do you operate?

1. Monthly groceries
2. Funeral support
3. Both`;
      }

      if (input === "4") {
        session.data.segment = "Insurance Company";
        session.step = "insurance_details";
        return `We partner with insurers to fulfil grocery benefits and funeral support.

Please send your details like this:

Company Name | Contact Person | Role | Region`;
      }

      if (input === "5") {
        session.data.segment = "Grocery Cover Member";
        session.data.paymentModel = "Benefit";
        session.step = "member_id";
        return `We are here to support your grocery benefits 🙏

Please send your Policy Number or ID Number.`;
      }

      if (input === "6") {
        session.data.segment = "Private Customer";
        session.data.paymentModel = "Cash";
        session.step = "private_option";
        return `We can assist you with groceries and meat for funerals.

How would you like to proceed?

1. Choose a package
2. Send a custom grocery list`;
      }

      if (input === "7") {
        session.data.segment = "Government / Institution";
        session.step = "government_details";
        return `We support institutions with large-scale grocery and food supply.

Please send your details like this:

Department / Institution | Contact Person | Area | Type of support required`;
      }

      return "Please reply with a number from 1 to 7.";

    case "undertaker_payment":
      if (input === "1") session.data.paymentModel = "Cash";
      else if (input === "2") session.data.paymentModel = "Account";
      else if (input === "3") session.data.paymentModel = "Benefit";
      else return "Please reply with 1, 2, or 3.";

      session.step = "undertaker_details";
      return `Please send your details like this:

Your Name | Business Name | Area | Funerals per month`;

    case "undertaker_details": {
      const parts = text.split("|").map((item) => item.trim());

      if (parts.length < 4) {
        return "Please send: Your Name | Business Name | Area | Funerals per month";
      }

      session.data.phone = phone;
      session.data.name = parts[0];
      session.data.businessName = parts[1];
      session.data.area = parts[2];
      session.data.funeralsPerMonth = parts[3];
      session.step = "undertaker_activation";

      return `You’re all set ✅

Do you have a funeral coming up?

1. Yes – Place order
2. Not yet`;
    }

    case "undertaker_activation":
      if (input === "1") {
        session.step = "undertaker_order";
        return `Please send your order like this:

Funeral Date | Delivery Location | Package or Grocery List`;
      }

      if (input === "2") {
        saveLead(session.data);
        session.step = "done";
        return `No problem 🙏

We’re here whenever you need help. Type MENU anytime to start again.`;
      }

      return "Please reply with 1 or 2.";

    case "undertaker_order": {
      const parts = text.split("|").map((item) => item.trim());

      if (parts.length < 3) {
        return "Please send: Funeral Date | Delivery Location | Package or Grocery List";
      }

      session.data.funeralDate = parts[0];
      session.data.deliveryLocation = parts[1];
      session.data.orderDetails = parts[2];
      saveLead(session.data);
      session.step = "done";

      return `Thank you. Your undertaker order has been captured.

Type MENU to start again.`;
    }

    case "caterer_payment":
      if (input === "1") session.data.paymentModel = "Cash";
      else if (input === "2") session.data.paymentModel = "Account";
      else return "Please reply with 1 or 2.";

      session.step = "caterer_details";
      return `Please send your details like this:

Your Name | Business Name | Area | Type of events you cater for`;

    case "caterer_details": {
      const parts = text.split("|").map((item) => item.trim());

      if (parts.length < 4) {
        return "Please send: Your Name | Business Name | Area | Type of events you cater for";
      }

      session.data.phone = phone;
      session.data.name = parts[0];
      session.data.businessName = parts[1];
      session.data.area = parts[2];
      session.data.eventType = parts[3];
      session.step = "caterer_activation";

      return `You can now place bulk orders anytime.

Would you like to:

1. Place an order now
2. Be contacted later`;
    }

    case "caterer_activation":
      if (input === "1") {
        session.step = "caterer_order";
        return `Please send your order like this:

Event Date | Delivery Location | Grocery or Meat List | Estimated Quantity`;
      }

      if (input === "2") {
        saveLead(session.data);
        session.step = "done";
        return `Thank you. We will keep your details and assist when you are ready.

Type MENU to start again.`;
      }

      return "Please reply with 1 or 2.";

    case "caterer_order": {
      const parts = text.split("|").map((item) => item.trim());

      if (parts.length < 4) {
        return "Please send: Event Date | Delivery Location | Grocery or Meat List | Estimated Quantity";
      }

      session.data.eventDate = parts[0];
      session.data.deliveryLocation = parts[1];
      session.data.orderDetails = parts[2];
      session.data.estimatedQuantity = parts[3];
      saveLead(session.data);
      session.step = "done";

      return `Thank you. Your catering order request has been captured.

Type MENU to start again.`;
    }

    case "stokvel_type":
      if (input === "1") session.data.useType = "Monthly groceries";
      else if (input === "2") session.data.useType = "Funeral support";
      else if (input === "3") session.data.useType = "Both";
      else return "Please reply with 1, 2, or 3.";

      session.step = "stokvel_details";
      return `Please send your details like this:

Group Name | Number of Members | Area | Buying Cycle`;

    case "stokvel_details": {
      const parts = text.split("|").map((item) => item.trim());

      if (parts.length < 4) {
        return "Please send: Group Name | Number of Members | Area | Buying Cycle";
      }

      session.data.phone = phone;
      session.data.groupName = parts[0];
      session.data.memberCount = parts[1];
      session.data.area = parts[2];
      session.data.buyingCycle = parts[3];
      session.step = "stokvel_activation";

      return `Thank you 🙌

Would you like to:

1. Plan your next grocery order
2. Speak to our team first`;
    }

    case "stokvel_activation":
      if (input === "1") {
        session.step = "stokvel_order";
        return `Please send your order like this:

Delivery Date | Preferred Grocery Package or Shopping List | Delivery Location`;
      }

      if (input === "2") {
        saveLead(session.data);
        session.step = "done";
        return `Thank you. Our team will assist you with planning and delivery options.

Type MENU to start again.`;
      }

      return "Please reply with 1 or 2.";

    case "stokvel_order": {
      const parts = text.split("|").map((item) => item.trim());

      if (parts.length < 3) {
        return "Please send: Delivery Date | Preferred Grocery Package or Shopping List | Delivery Location";
      }

      session.data.deliveryDate = parts[0];
      session.data.orderDetails = parts[1];
      session.data.deliveryLocation = parts[2];
      saveLead(session.data);
      session.step = "done";

      return `Thank you. Your stokvel order request has been captured.

Type MENU to start again.`;
    }

    case "insurance_details": {
      const parts = text.split("|").map((item) => item.trim());

      if (parts.length < 4) {
        return "Please send: Company Name | Contact Person | Role | Region";
      }

      session.data.phone = phone;
      session.data.companyName = parts[0];
      session.data.contactPerson = parts[1];
      session.data.role = parts[2];
      session.data.region = parts[3];
      session.data.status = "Escalated to Partnerships Team";
      saveLead(session.data);
      session.step = "done";

      return `Thank you. Your request has been escalated to our partnerships team.

Type MENU to start again.`;
    }

    case "member_id":
      session.data.phone = phone;
      session.data.memberId = text.trim();
      session.step = "member_delivery";
      return `Thank you ✅ Your grocery support is active.

Please send your delivery details like this:

Address | Preferred Delivery Day`;

    case "member_delivery": {
      const parts = text.split("|").map((item) => item.trim());

      if (parts.length < 2) {
        return "Please send: Address | Preferred Delivery Day";
      }

      session.data.address = parts[0];
      session.data.preferredDeliveryDay = parts[1];
      saveLead(session.data);
      session.step = "done";

      return `We will deliver your groceries monthly.

You can track or update your details anytime.

Type MENU to start again.`;
    }

    case "private_option":
      if (input === "1") {
        session.data.orderType = "Package";
        session.step = "private_details";
        return `Please send your details like this:

Your Name | Delivery Location | Funeral Date`;
      }

      if (input === "2") {
        session.data.orderType = "Custom List";
        session.step = "private_details";
        return `Please send your details like this:

Your Name | Delivery Location | Funeral Date`;
      }

      return "Please reply with 1 or 2.";

    case "private_details": {
      const parts = text.split("|").map((item) => item.trim());

      if (parts.length < 3) {
        return "Please send: Your Name | Delivery Location | Funeral Date";
      }

      session.data.phone = phone;
      session.data.name = parts[0];
      session.data.deliveryLocation = parts[1];
      session.data.funeralDate = parts[2];

      if (session.data.orderType === "Package") {
        session.step = "private_package";
        return `Please choose a package:

1. Small
2. Medium
3. Large`;
      }

      session.step = "private_custom_list";
      return "Please send your custom grocery list.";
    }

    case "private_package":
      if (input === "1") session.data.package = "Small";
      else if (input === "2") session.data.package = "Medium";
      else if (input === "3") session.data.package = "Large";
      else return "Please reply with 1, 2, or 3.";

      saveLead(session.data);
      session.step = "done";

      return `Thank you. Your package request has been captured.

Type MENU to start again.`;

    case "private_custom_list":
      session.data.customList = text.trim();
      saveLead(session.data);
      session.step = "done";

      return `Thank you. Your custom grocery list has been captured.

Type MENU to start again.`;

    case "government_details": {
      const parts = text.split("|").map((item) => item.trim());

      if (parts.length < 4) {
        return "Please send: Department / Institution | Contact Person | Area | Type of support required";
      }

      session.data.phone = phone;
      session.data.department = parts[0];
      session.data.contactPerson = parts[1];
      session.data.area = parts[2];
      session.data.supportType = parts[3];
      session.data.status = "Escalated to Enterprise Team";
      saveLead(session.data);
      session.step = "done";

      return `Thank you. Your request has been escalated to the enterprise team.

Type MENU to start again.`;
    }

    case "done":
      return `You are already registered.

Type MENU to start again.`;

    default:
      resetSession(session);
      session.step = "segment";
      return welcomeMessage();
  }
}

async function sendWhatsAppText(to, body) {
  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body }
    })
  });

  const result = await response.json();
  console.log("WhatsApp send result:", result);

  if (!response.ok) {
    throw new Error(`WhatsApp send failed: ${response.status} ${JSON.stringify(result)}`);
  }
}

app.get("/", (_req, res) => {
  res.send("MWOW bot is running");
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified ✅");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
  try {
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!message) {
      return res.sendStatus(200);
    }

    const from = message.from;
    const text = message.text?.body || "";

    console.log("Incoming WhatsApp:", { from, text });

    const session = getSession(from);
    const reply = getReply(session, text, from);

    console.log("Bot reply:", reply);

    await sendWhatsAppText(from, reply);

    return res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    return res.sendStatus(500);
  }
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
  const reply = getReply(session, text, phone);

  res.json({
    ok: true,
    phone,
    text,
    reply,
    session
  });
});

app.get("/leads", (_req, res) => {
  res.json(loadLeads());
});

app.get("/dashboard", (_req, res) => {
  const leads = loadLeads();

  const rows = leads.map((lead, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${lead.segment || ""}</td>
      <td>${lead.name || lead.contactPerson || lead.groupName || lead.companyName || lead.department || ""}</td>
      <td>${lead.phone || ""}</td>
      <td>${lead.businessName || lead.area || lead.deliveryLocation || ""}</td>
      <td>${lead.status || ""}</td>
      <td>${lead.savedAt || ""}</td>
    </tr>
  `).join("");

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>MWOW Leads Dashboard</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          background: #f5f5f5;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        th {
          background: #222;
          color: white;
        }
      </style>
    </head>
    <body>
      <h1>MWOW Leads Dashboard</h1>
      <p>Total Leads: ${leads.length}</p>
      <p><a href="/export-csv">Download CSV</a></p>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Segment</th>
            <th>Name / Contact</th>
            <th>Phone</th>
            <th>Business / Area</th>
            <th>Status</th>
            <th>Saved At</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `);
});

app.get("/export-csv", (_req, res) => {
  const leads = loadLeads();

  const headers = [
    "Segment",
    "Name",
    "ContactPerson",
    "GroupName",
    "CompanyName",
    "Department",
    "Phone",
    "BusinessName",
    "Area",
    "DeliveryLocation",
    "Status",
    "SavedAt"
  ];

  const escapeCsv = (value) => {
    const stringValue = String(value ?? "");
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const rows = leads.map((lead) => [
    lead.segment,
    lead.name,
    lead.contactPerson,
    lead.groupName,
    lead.companyName,
    lead.department,
    lead.phone,
    lead.businessName,
    lead.area,
    lead.deliveryLocation,
    lead.status,
    lead.savedAt
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map(escapeCsv).join(","))
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="mwow-leads.csv"');
  res.send(csv);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});