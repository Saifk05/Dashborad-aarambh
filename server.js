// import express from "express";
// import cors from "cors";
// import fetch from "node-fetch";

// const app = express();
// const PORT = 5000;

// app.use(cors());

// const GAS_URL = "https://script.google.com/macros/s/AKfycbwdPX2ufcqWIaNkBjZXeXMziJEfLjTMbWczx-OrhbAt4Lx2sbzvuVHHnzWhld0MO9I/exec";

// // Proxy endpoint
// app.get("/api/data", async (req, res) => {
    
//   try {
//     const queryParams = new URLSearchParams(req.query).toString();
//     const url = `${GAS_URL}?${queryParams}`;

//     console.log(" Fetching data from GAS URL:", url);

//     const response = await fetch(url);
//     const text = await response.text();

//     console.log("📦 Raw response from GAS (first 500 chars):");
//     console.log(text.slice(0, 500));

//     let data;
//     try {
//       data = JSON.parse(text);
//     } catch (err) {
//       console.error(" JSON parsing failed. Response might be HTML instead of JSON.");
//       return res.status(500).json({
//         error: "Response from GAS is not valid JSON",
//         hint: "Ensure the Apps Script deployment allows public access and returns JSON via ContentService",
//       });
//     }

//     const rows = Array.isArray(data) ? data : data.data || [];
//     console.log(" Successfully parsed JSON data. Sample rows:", rows.slice(0, 3));

//     res.json(data);
//   } catch (error) {
//     console.error(" Error fetching from GAS:", error);
//     res.status(500).json({ error: "Failed to fetch data from Google Apps Script" });
//   }
// });

// app.listen(PORT, () => console.log(` Node server running on http://localhost:${PORT}`));


import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
const PORT = 5000;

app.use(cors());

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbz6A_Nn6vd7oRhhB1CIzB3q_TjPswpfcNm2GvxVx1N85o4HEWeEfZ7V8zMjSxtMPPPN/exec";

// Proxy endpoint
app.get("/api/data", async (req, res) => {
  try {
    // Forward all query params: page, limit, filters
    const queryParams = new URLSearchParams(req.query).toString();
    const url = `${GAS_URL}?${queryParams}`;

    console.log("🌍 Fetching from GAS:", url);

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(500).json({
        ok: false,
        error: `GAS returned HTTP ${response.status}`,
      });
    }

    const text = await response.text();

    // Sometimes GAS returns HTML — protect JSON parsing
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      console.error("❌ GAS returned non-JSON output!");
      return res.status(500).json({
        ok: false,
        error: "GAS did not return valid JSON",
        raw: text.slice(0, 300),
      });
    }

    // Log total items if available
    if (parsed?.total !== undefined) {
      console.log(`📦 Total records available: ${parsed.total}`);
      console.log(`📄 Returned this page: ${parsed.data?.length}`);
    }

    return res.json(parsed);
  } catch (error) {
    console.error("❌ Server error:", error);
    return res.status(500).json({
      ok: false,
      error: "Failed to reach GAS backend",
      details: error.toString(),
    });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 Node server running on http://localhost:${PORT}`)
);
