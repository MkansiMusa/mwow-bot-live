import express from "express";
import fs from "fs";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
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
    (lead) =>
      lead.phone === data.phone &&
      lead.segment === data.segment
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

function getWelcomeMessage() {
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
  const input = String(text).trim().toLowerCase();

  if (input === "menu" || input === "restart" || input === "start") {
    resetSession(session);
    session.step = "segment";
    return getWelcomeMessage();
  }

  switch (session.step) {
    case "welcome":
      session.step = "segment";
      return getWelcomeMessage();

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
        session.step = "caterer_details";
        return `Please send your details like this:

Your Name | Business Name | Area | Type of events you cater for`;
      }

      if (input === "3") {
        session.data.segment = "Grocery Club / Stokvel";
        session.step = "stokvel_details";
        return `Please send your details like this:

Group Name | Number of Members | Area | Buying Cycle`;
      }

      if (input === "4") {
        session.data.segment = "Insurance Company";
        session.step = "insurance_details";
        return `Please send your details like this:

Company Name | Contact Person | Role | Region`;
      }

      if (input === "5") {
        session.data.segment = "Grocery Cover Member";
        session.step = "member_id";
        return `Please send your Policy Number or ID Number.`;
      }

      if (input === "6") {
        session.data.segment = "Private Customer";
        session.step = "private_option";
        return `How would you like to proceed?

1. Choose a package
2. Send a custom grocery list`;
      }

      if (input === "7") {
        session.data.segment = "Government / Institution";
        session.step = "government_details";
        return `Please send your details like this:

Department / Institution | Contact Person | Area | Type of support required`;
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
      saveLead(session.data);
      session.step = "done";

      return `Thank you. Caterer details captured successfully.

Type MENU to start again.`;
    }

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
      saveLead(session.data);
      session.step = "done";

      return `Thank you. Grocery Club / Stokvel details captured successfully.

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
      saveLead(session.data);
      session.step = "done";

      return `Thank you. Your request has been escalated to our partnerships team.

Type MENU to start again.`;
    }

    case "member_id":
      session.data.phone = phone;
      session.data.memberId = text.trim();
      session.step = "member_delivery";
      return `Thank you ✅

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

      return `Your grocery support is active.

We will deliver your groceries monthly.
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
      saveLead(session.data);
      session.step = "done";

      return `Thank you. Your request has been escalated to the enterprise team.

Type MENU to start again.`;
    }

    case "done":
      return 'You are already in the flow. Type "menu" to restart.';

    default:
      resetSession(session);
      session.step = "segment";
      return getWelcomeMessage();
  }
}

app.get("/", (_req, res) => {
  res.send("MWOW bot is running");
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
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

app.get("/sessions", (_req, res) => {
  res.json(Array.from(sessions.entries()));
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
        h1 {
          color: #222;
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
        tr:nth-child(even) {
          background: #f9f9f9;
        }
      </style>
    </head>
    <body>
      <h1>MWOW Leads Dashboard</h1>
      <p>Total Leads: ${leads.length}</p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Segment</th>
            <th>Name / Contact</th>
            <th>Phone</th>
            <th>Business / Area</th>
            <th>Saved At</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
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

app.get("/search", (req, res) => {
  const q = String(req.query.q || "").toLowerCase().trim();
  const leads = loadLeads();

  if (!q) {
    return res.json({
      ok: false,
      error: "Please provide a search query, for example /search?q=musa"
    });
  }

  const results = leads.filter((lead) =>
    Object.values(lead).some((value) =>
      String(value).toLowerCase().includes(q)
    )
  );

  res.json({
    ok: true,
    query: q,
    count: results.length,
    results
  });
});

app.delete("/leads/:index", (req, res) => {
  const index = Number(req.params.index);
  const leads = loadLeads();

  if (Number.isNaN(index) || index < 0 || index >= leads.length) {
    return res.status(400).json({
      ok: false,
      error: "Invalid lead index"
    });
  }

  const deleted = leads.splice(index, 1)[0];
  saveLeads(leads);

  res.json({
    ok: true,
    deleted
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});