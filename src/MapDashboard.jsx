// import React, { useEffect, useState, useCallback } from "react";
// import {
//   MapContainer,
//   TileLayer,
//   Circle,
//   Tooltip,
//   Popup,
//   Marker,
//   useMapEvents,
// } from "react-leaflet";
// import axios from "axios";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import MarkerClusterGroup from "react-leaflet-cluster";

// const MapDashboard = () => {
//   const [data, setData] = useState([]);
//   const [zoomLevel, setZoomLevel] = useState(11);
//   const [filterPin, setFilterPin] = useState("");
//   const [allPins, setAllPins] = useState([]);

//   const API_URL = "https://negatively-viceregal-kairi.ngrok-free.dev/api/data";

//   // 🧹 Clean GPS "(12.97,77.59)" → [12.97, 77.59]
//   const cleanCoords = (gps) => {
//     if (!gps) return null;
//     const cleaned = gps.replace(/[()]/g, "").trim();
//     const parts = cleaned.split(",").map(Number);
//     if (parts.length !== 2 || parts.some(isNaN)) return null;
//     return parts;
//   };

//   // 📡 Fetch + group duplicate coordinates per PINCODE + store full record
//   const fetchData = useCallback(async () => {
//     try {
//       // const res = await axios.get(API_URL);
//       const res = await axios.get(API_URL, {
//   headers: {
//     "ngrok-skip-browser-warning": "69420",
//   },
// });

//       const rows = res.data.data || [];

//       // 🧩 Step 1: Deduplicate by start_gps + end_gps + start_area_code + end_area_code
//       const seen = new Set();
//       const uniqueRows = rows.filter((r) => {
//         // 🛑 Helper to detect null-like or empty values
//         const isInvalid = (val) => {
//           if (val === null || val === undefined) return true;
//           if (typeof val === "string") {
//             const v = val.trim().toLowerCase();
//             return v === "" || v === "null" || v === "undefined";
//           }
//           return false;
//         };

//         // 🛑 Skip if any of the key fields are invalid
//         if (
//           isInvalid(r.start_gps) ||
//           isInvalid(r.end_gps) ||
//           isInvalid(r.start_area_code) ||
//           isInvalid(r.end_area_code)
//         ) {
//           return false;
//         }

//         // 🧹 Clean GPS
//         const clean = (gps) => {
//           const cleaned = gps.replace(/[()]/g, "").trim();
//           const parts = cleaned.split(",").map((n) => parseFloat(n.trim()));
//           if (parts.length !== 2 || parts.some(isNaN)) return "";
//           return parts.map((x) => x.toFixed(5)).join(",");
//         };

//         const startGPS = clean(r.start_gps);
//         const endGPS = clean(r.end_gps);
//         const startPin = r.start_area_code.toString().trim();
//         const endPin = r.end_area_code.toString().trim();

//         // Skip if GPS failed to parse
//         if (!startGPS || !endGPS) return false;

//         // 🔄 Treat A→B and B→A as the same route
//         const forwardKey = [startGPS, endGPS, startPin, endPin].join("|");
//         const reverseKey = [endGPS, startGPS, endPin, startPin].join("|");

//         if (seen.has(forwardKey) || seen.has(reverseKey)) return false;
//         seen.add(forwardKey);
//         return true;
//       });

//       // 🧮 Step 2: Group after deduplication
//       const grouped = {};
//       const pinSet = new Set();

//       uniqueRows.forEach((r) => {
//         const gpsList = [
//           { gps: r.start_gps, type: "start" },
//           { gps: r.end_gps, type: "end" },
//         ].filter((x) => x.gps);

//         const pin = r.start_area_code || r.end_area_code || "Unknown";
//         if (pin) pinSet.add(pin);

//         gpsList.forEach(({ gps, type }) => {
//           const coords = cleanCoords(gps);
//           if (!coords) return;

//           const key = `${pin}_${coords.join(",")}_${type}`;
//           if (!grouped[key]) {
//             grouped[key] = {
//               pincode: pin,
//               coords,
//               count: 0,
//               samples: [],
//             };
//           }

//           grouped[key].count += 1;
//           grouped[key].samples.push({
//             action: r.action,
//             created_time: r.created_time,
//             bap_id: r.bap_id,
//             transaction_id: r.transaction_id,
//             message_id: r.message_id,
//             category: r.category,
//             category_id: r.category_id,
//             start_gps: r.start_gps,
//             end_gps: r.end_gps,
//           });
//         });
//       });

//       setData(Object.values(grouped));
//       setAllPins([...pinSet].sort());
//     } catch (err) {
//       console.error("❌ Error fetching data:", err);
//     }
//   }, [API_URL]);

//   useEffect(() => {
//     fetchData();
//   }, [fetchData]);

//   // 🎨 Color logic
//   const getColor = (count) => {
//     if (count > 1000) return "#006400";
//     if (count > 500) return "#32CD32";
//     if (count > 100) return "#FFD700";
//     if (count > 20) return "#FFA500";
//     return "#FF0000";
//   };

//   // 🔁 Zoom-adaptive radius
//   const getRadius = (count, zoom) => {
//     const base = Math.log(count + 1) * 120;
//     const zoomScale = 12 / zoom;
//     const radius = base * zoomScale;
//     return Math.max(50, Math.min(radius, 1500));
//   };

//   // 📍 Marker icon
//   const markerIcon = new L.Icon({
//     iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
//     iconSize: [32, 32],
//     iconAnchor: [16, 32],
//   });

//   // 👁️ Track zoom
//   const ZoomTracker = () => {
//     useMapEvents({
//       zoomend: (e) => setZoomLevel(e.target.getZoom()),
//     });
//     return null;
//   };

//   // 🔍 Filter by pincode
//   const filteredData = data.filter((item) => {
//     if (!filterPin.trim()) return true;
//     return item.pincode.toString() === filterPin.trim();
//   });

//   return (
//     <div>
//       <h2 style={{ textAlign: "center", margin: "10px" }}>
//         Coordinates by Pincode (Full Details on Hover)
//       </h2>

//       {/* 🔽 Dropdown Filter */}
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "center",
//           gap: "10px",
//           marginBottom: "10px",
//         }}
//       >
//         <select
//           value={filterPin}
//           onChange={(e) => setFilterPin(e.target.value)}
//           style={{
//             padding: "6px 10px",
//             borderRadius: "6px",
//             border: "1px solid #ccc",
//             width: "220px",
//           }}
//         >
//           <option value="">All Pincodes</option>
//           {allPins.map((pin) => (
//             <option key={pin} value={pin}>
//               {pin}
//             </option>
//           ))}
//         </select>

//         <button
//           type="button"
//           onClick={() => setFilterPin("")}
//           style={{
//             padding: "6px 12px",
//             backgroundColor: "#6c757d",
//             color: "white",
//             border: "none",
//             borderRadius: "6px",
//             cursor: "pointer",
//           }}
//         >
//           Reset
//         </button>
//       </div>

//       {/* 🗺️ Map */}
//       <MapContainer
//         center={[12.97, 77.59]}
//         zoom={11}
//         style={{ height: "85vh", width: "100%" }}
//       >
//         <ZoomTracker />

//         <TileLayer
//           attribution='&copy; OpenStreetMap contributors'
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />

//         {/* 🧩 Clustered markers */}
//         <MarkerClusterGroup>
//           {filteredData.map((item, i) => (
//             <Marker key={i} position={item.coords} icon={markerIcon}>
//               <Popup>
//                 <b>Pincode:</b> {item.pincode} <br />
//                 <b>Lat:</b> {item.coords[0]} <br />
//                 <b>Lng:</b> {item.coords[1]} <br />
//                 <b>Count:</b> {item.count}
//                 <hr />
//                 {item.samples.slice(0, 3).map((s, j) => (
//                   <div key={j} style={{ marginBottom: "6px" }}>
//                     <b>Action:</b> {s.action} <br />
//                     <b>BAP:</b> {s.bap_id} <br />
//                     <b>Txn:</b> {s.transaction_id} <br />
//                     <b>Msg:</b> {s.message_id} <br />
//                     <b>Category:</b> {s.category} ({s.category_id}) <br />
//                     <small>
//                       <b>Created:</b>{" "}
//                       {new Date(s.created_time).toLocaleString()}
//                     </small>
//                     <hr />
//                   </div>
//                 ))}
//                 {item.samples.length > 3 && (
//                   <small style={{ color: "gray" }}>
//                     +{item.samples.length - 3} more records...
//                   </small>
//                 )}
//               </Popup>
//             </Marker>
//           ))}
//         </MarkerClusterGroup>

//         {/* 🟢 Circles with detailed Tooltip */}
//         {filteredData.map((item, i) => (
//           <Circle
//             key={`circle-${i}`}
//             center={item.coords}
//             radius={getRadius(item.count, zoomLevel)}
//             color={getColor(item.count)}
//             fillColor={getColor(item.count)}
//             fillOpacity={0.4}
//             weight={1.5}
//           >
//             <Tooltip direction="top" offset={[0, -15]} permanent={false}>
//               <b>Pincode:</b> {item.pincode} <br />
//               <b>Lat:</b> {item.coords[0].toFixed(4)} <br />
//               <b>Lng:</b> {item.coords[1].toFixed(4)} <br />
//               <b>Count:</b> {item.count} <br />
//               <b>Action:</b> {item.samples[0]?.action || "-"} <br />
//               <b>BAP:</b> {item.samples[0]?.bap_id || "-"} <br />
//               <b>Txn:</b> {item.samples[0]?.transaction_id || "-"} <br />
//               <b>Category:</b> {item.samples[0]?.category || "-"}
//             </Tooltip>
//           </Circle>
//         ))}
//       </MapContainer>
//     </div>
//   );
// };

// export default MapDashboard;


// import React, { useEffect, useState, useCallback } from "react";
// import {
//   MapContainer,
//   TileLayer,
//   Circle,
//   Tooltip,
//   Popup,
//   Marker,
//   useMapEvents,
// } from "react-leaflet";
// import axios from "axios";
// import L from "leaflet";
// import "leaflet/dist/leaflet.css";
// import MarkerClusterGroup from "react-leaflet-cluster";

// const MapDashboard = () => {
//   const [data, setData] = useState([]);
//   const [zoomLevel, setZoomLevel] = useState(11);
//   const [filterPin, setFilterPin] = useState("");
//   const [allPins, setAllPins] = useState([]);

//   // Pagination
//   const [page, setPage] = useState(1);
//   const pageSize = 50;

//   const API_URL = "https://negatively-viceregal-kairi.ngrok-free.dev/api/data";

//   // Clean GPS "(12.97,77.59)"
//   const cleanCoords = (gps) => {
//     if (!gps) return null;
//     const cleaned = gps.replace(/[()]/g, "").trim();
//     const parts = cleaned.split(",").map(Number);
//     if (parts.length !== 2 || parts.some(isNaN)) return null;
//     return parts;
//   };

//   const fetchData = useCallback(async () => {
//     try {
//       const res = await axios.get(API_URL, {
//         headers: { "ngrok-skip-browser-warning": "69420" },
//       });

//       const rows = res.data.data || [];
//       const seen = new Set();

//       const isMissingGPS = (gps) => {
//         if (!gps) return true;
//         const clean = gps.trim().toLowerCase();
//         return clean === "" || clean === "null" || clean === "undefined";
//       };

//       const uniqueRows = rows.filter((r) => {
//         if (isMissingGPS(r.start_gps) && isMissingGPS(r.end_gps)) {
//           return false;
//         }

//         const clean = (gps) => {
//           if (!gps) return "";
//           const cleaned = gps.replace(/[()]/g, "").trim();
//           const parts = cleaned.split(",").map((n) => parseFloat(n.trim()));
//           if (parts.length !== 2 || parts.some(isNaN)) return "";
//           return parts.map((x) => x.toFixed(5)).join(",");
//         };

//         const startGPS = clean(r.start_gps);
//         const endGPS = clean(r.end_gps);

//         const startPin = r.start_area_code
//           ? String(r.start_area_code).trim()
//           : "Unknown";
//         const endPin = r.end_area_code
//           ? String(r.end_area_code).trim()
//           : "Unknown";

//         const forwardKey = [startGPS, endGPS, startPin, endPin].join("|");
//         const reverseKey = [endGPS, startGPS, endPin, startPin].join("|");

//         if (seen.has(forwardKey) || seen.has(reverseKey)) return false;

//         seen.add(forwardKey);
//         return true;
//       });

//       const grouped = {};
//       const pinSet = new Set();

//       uniqueRows.forEach((r) => {
//         const gpsList = [
//           { gps: r.start_gps, type: "start" },
//           { gps: r.end_gps, type: "end" },
//         ];

//         const pin = String(r.start_area_code ?? r.end_area_code ?? "Unknown");
//         pinSet.add(pin);

//         gpsList.forEach(({ gps, type }) => {
//           const coords = cleanCoords(gps);
//           if (!coords) return;

//           const key = `${pin}_${coords.join(",")}_${type}`;

//           if (!grouped[key]) {
//             grouped[key] = {
//               pincode: pin,
//               coords,
//               count: 0,
//               samples: [],
//             };
//           }

//           grouped[key].count++;
//           grouped[key].samples.push({
//             action: r.action,
//             created_time: r.created_time,
//             bap_id: r.bap_id,
//             transaction_id: r.transaction_id,
//             message_id: r.message_id,
//             category: r.category,
//             category_id: r.category_id,
//           });
//         });
//       });

//       const sortedPins = [...pinSet].sort();

//       setData(Object.values(grouped));
//       setAllPins(sortedPins);
//     } catch (err) {
//       console.error("❌ Error fetching data:", err);
//     }
//   }, []);

//   useEffect(() => {
//     fetchData();
//   }, [fetchData]);

//   // Auto-select first pincode — FIXED (no ESLint warning, no infinite loop)
//   useEffect(() => {
//     if (allPins.length > 0) {
//       setFilterPin((prev) => prev || String(allPins[0]));
//     }
//   }, [allPins]);

//   // Reset page when filter changes
//   useEffect(() => {
//     setPage(1);
//   }, [filterPin]);

//   // Filter logic
//   const filteredData = data.filter((item) => {
//     if (!filterPin) return true;
//     return String(item.pincode) === String(filterPin);
//   });

//   // Pagination only for ALL pincodes
//   const paginatedData =
//     filterPin === ""
//       ? filteredData.slice((page - 1) * pageSize, page * pageSize)
//       : filteredData;

//   const getColor = (count) => {
//     if (count > 1000) return "#006400";
//     if (count > 500) return "#32CD32";
//     if (count > 100) return "#FFD700";
//     if (count > 20) return "#FFA500";
//     return "#FF0000";
//   };

//   const getRadius = (count, zoom) => {
//     const base = Math.log(count + 1) * 120;
//     const zoomScale = 12 / zoom;
//     return Math.max(50, Math.min(base * zoomScale, 1500));
//   };

//   const markerIcon = new L.Icon({
//     iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
//     iconSize: [32, 32],
//     iconAnchor: [16, 32],
//   });

//   const ZoomTracker = () => {
//     useMapEvents({
//       zoomend: (e) => setZoomLevel(e.target.getZoom()),
//     });
//     return null;
//   };

//   return (
//     <div>
//       <h2 style={{ textAlign: "center", margin: "10px" }}>
//         Coordinates by Pincode (Null Safe + Pagination)
//       </h2>

//       {/* PINCODE FILTER */}
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "center",
//           gap: "10px",
//           marginBottom: "10px",
//         }}
//       >
//         <select
//           value={filterPin}
//           onChange={(e) => setFilterPin(e.target.value)}
//           style={{
//             padding: "6px 10px",
//             borderRadius: "6px",
//             border: "1px solid #ccc",
//             width: "220px",
//           }}
//         >
//           <option value="">All Pincodes</option>

//           {allPins.map((pin) => (
//             <option key={pin} value={pin}>
//               {pin}
//             </option>
//           ))}
//         </select>

//         <button
//           type="button"
//           onClick={() => setFilterPin("")}
//           style={{
//             padding: "6px 12px",
//             backgroundColor: "#6c757d",
//             color: "white",
//             borderRadius: "6px",
//             border: "none",
//             cursor: "pointer",
//           }}
//         >
//           Reset
//         </button>
//       </div>

//       {/* PAGINATION */}
//       {filterPin === "" && (
//         <div
//           style={{
//             display: "flex",
//             justifyContent: "center",
//             gap: "15px",
//             marginBottom: "10px",
//           }}
//         >
//           <button
//             disabled={page === 1}
//             onClick={() => setPage(page - 1)}
//             style={{
//               padding: "6px 12px",
//               borderRadius: "6px",
//               background: page === 1 ? "#ccc" : "#007bff",
//               color: "white",
//               cursor: page === 1 ? "not-allowed" : "pointer",
//               border: "none",
//             }}
//           >
//             Previous
//           </button>

//           <span style={{ fontSize: "16px", fontWeight: "bold" }}>
//             Page {page} / {Math.ceil(filteredData.length / pageSize) || 1}
//           </span>

//           <button
//             disabled={page >= Math.ceil(filteredData.length / pageSize)}
//             onClick={() => setPage(page + 1)}
//             style={{
//               padding: "6px 12px",
//               borderRadius: "6px",
//               background:
//                 page >= Math.ceil(filteredData.length / pageSize)
//                   ? "#ccc"
//                   : "#007bff",
//               color: "white",
//               cursor:
//                 page >= Math.ceil(filteredData.length / pageSize)
//                   ? "not-allowed"
//                   : "pointer",
//               border: "none",
//             }}
//           >
//             Next
//           </button>
//         </div>
//       )}

//       {/* MAP */}
//       <MapContainer
//         center={[12.97, 77.59]}
//         zoom={11}
//         style={{ height: "85vh", width: "100%" }}
//       >
//         <ZoomTracker />

//         <TileLayer
//           attribution="&copy; OpenStreetMap contributors"
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />

//         {/* MARKERS */}
//         <MarkerClusterGroup>
//           {paginatedData.map((item, index) => (
//             <Marker key={index} position={item.coords} icon={markerIcon}>
//               <Popup>
//                 <b>Pincode:</b> {item.pincode} <br />
//                 <b>Lat:</b> {item.coords[0]} <br />
//                 <b>Lng:</b> {item.coords[1]} <br />
//                 <b>Count:</b> {item.count}
//               </Popup>
//             </Marker>
//           ))}
//         </MarkerClusterGroup>

//         {/* CIRCLES */}
//         {paginatedData.map((item, index) => (
//           <Circle
//             key={`circle-${index}`}
//             center={item.coords}
//             radius={getRadius(item.count, zoomLevel)}
//             color={getColor(item.count)}
//             fillColor={getColor(item.count)}
//             fillOpacity={0.4}
//             weight={1.5}
//           >
//             <Tooltip direction="top" offset={[0, -15]}>
//               <b>Pincode:</b> {item.pincode} <br />
//               <b>Count:</b> {item.count}
//             </Tooltip>
//           </Circle>
//         ))}
//       </MapContainer>
//     </div>
//   );
// };

// export default MapDashboard;


import React, { useEffect, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Circle,
  Tooltip,
  Popup,
  Marker,
  useMapEvents,
} from "react-leaflet";
import axios from "axios";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MarkerClusterGroup from "react-leaflet-cluster";

const MapDashboard = () => {
  const [data, setData] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(11);
  const [filterPin, setFilterPin] = useState("");
  const [allPins, setAllPins] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const API_URL = "https://negatively-viceregal-kairi.ngrok-free.dev/api/data";

  // Clean GPS "(12.97,77.59)"
  const cleanCoords = (gps) => {
    if (!gps) return null;
    const cleaned = gps.replace(/[()]/g, "").trim();
    const parts = cleaned.split(",").map(Number);
    if (parts.length !== 2 || parts.some(isNaN)) return null;
    return parts;
  };

  /** -------------------------------------------------
   *  MAIN API CALL (NOW USING BACKEND PAGINATION)
   * ------------------------------------------------- */
  const fetchData = useCallback(async () => {
    try {
      const res = await axios.get(API_URL, {
        params: {
          page,
          limit: pageSize,
          start_area_code: filterPin || "",
          end_area_code: filterPin || "",
        },
        headers: { "ngrok-skip-browser-warning": "69420" },
      });

      console.log("🚀 API Response:", res.data);

      const rows = res.data.data || [];
      const seen = new Set();

      const isMissingGPS = (gps) => {
        if (!gps) return true;
        const clean = String(gps).trim().toLowerCase();
        return clean === "" || clean === "null" || clean === "undefined";
      };

      /** REMOVE DUPLICATES + CLEAN */
      const uniqueRows = rows.filter((r) => {
        if (isMissingGPS(r.start_gps) && isMissingGPS(r.end_gps)) return false;

        const clean = (gps) => {
          if (!gps) return "";
          const cleaned = gps.replace(/[()]/g, "").trim();
          const parts = cleaned.split(",").map(Number);
          if (parts.length !== 2 || parts.some(isNaN)) return "";
          return parts.map((x) => x.toFixed(5)).join(",");
        };

        const startGPS = clean(r.start_gps);
        const endGPS = clean(r.end_gps);
        const startPin = String(r.start_area_code || "").trim();
        const endPin = String(r.end_area_code || "").trim();

        const key = `${startGPS}|${endGPS}|${startPin}|${endPin}`;
        const reverse = `${endGPS}|${startGPS}|${endPin}|${startPin}`;

        if (seen.has(key) || seen.has(reverse)) return false;
        seen.add(key);
        return true;
      });

      /** GROUP BY PINCODE */
      const grouped = {};
      const pinSet = new Set();

      uniqueRows.forEach((r) => {
        const gpsList = [
          { gps: r.start_gps, type: "start" },
          { gps: r.end_gps, type: "end" },
        ];

        const pin = String(r.start_area_code || r.end_area_code || "Unknown");
        pinSet.add(pin);

        gpsList.forEach(({ gps, type }) => {
          const coords = cleanCoords(gps);
          if (!coords) return;

          const key = `${pin}_${coords.join(",")}_${type}`;

          if (!grouped[key]) {
            grouped[key] = {
              pincode: pin,
              coords,
              count: 0,
              samples: [],
            };
          }

          grouped[key].count++;
          grouped[key].samples.push(r);
        });
      });

      setAllPins([...pinSet].sort());
      setData(Object.values(grouped));
    } catch (err) {
      console.error("❌ Error fetching data:", err);
    }
  }, [page, filterPin]); // 🔥 refetch when page OR filter changes

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filterPin]);

  // Filter for ALL PINCODES mode
  const filteredData = filterPin
    ? data.filter((item) => item.pincode === filterPin)
    : data;

  // Paginate ONLY when All Pincode mode
  const paginatedData =
    filterPin === ""
      ? filteredData.slice((page - 1) * pageSize, page * pageSize)
      : filteredData;

  const getColor = (count) => {
    if (count > 1000) return "#006400";
    if (count > 500) return "#32CD32";
    if (count > 100) return "#FFD700";
    if (count > 20) return "#FFA500";
    return "#FF0000";
  };

  const getRadius = (count, zoom) => {
    const base = Math.log(count + 1) * 120;
    const zoomScale = 12 / zoom;
    return Math.max(50, Math.min(base * zoomScale, 1500));
  };

  const markerIcon = new L.Icon({
    iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });

  const ZoomTracker = () => {
    useMapEvents({
      zoomend: (e) => setZoomLevel(e.target.getZoom()),
    });
    return null;
  };

  return (
    <div>
      <h2 style={{ textAlign: "center", margin: "10px" }}>
        Coordinates by Pincode 
      </h2>

      {/* PINCODE FILTER */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
        <select
          value={filterPin}
          onChange={(e) => setFilterPin(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: "6px" }}
        >
          <option value="">All Pincodes</option>
          {allPins.map((pin) => (
            <option key={pin} value={pin}>
              {pin}
            </option>
          ))}
        </select>

        <button
          onClick={() => setFilterPin("")}
          style={{
            padding: "6px 12px",
            background: "#666",
            color: "white",
            borderRadius: "6px",
          }}
        >
          Reset
        </button>
      </div>

      {/* PAGINATION */}
      {filterPin === "" && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "15px",
            margin: "10px",
          }}
        >
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            style={{
              padding: "6px 12px",
              background: page === 1 ? "#999" : "#007bff",
              color: "white",
            }}
          >
            Previous
          </button>

          <span style={{ fontWeight: "bold" }}>Page {page}</span>

          <button
            onClick={() => setPage(page + 1)}
            style={{
              padding: "6px 12px",
              background: "#007bff",
              color: "white",
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* MAP */}
      <MapContainer
        center={[12.97, 77.59]}
        zoom={11}
        style={{ height: "85vh", width: "100%" }}
      >
        <ZoomTracker />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        <MarkerClusterGroup>
          {paginatedData.map((item, i) => (
            <Marker key={i} position={item.coords} icon={markerIcon}>
              <Popup>
                <b>Pincode:</b> {item.pincode} <br />
                <b>Lat:</b> {item.coords[0]} <br />
                <b>Lng:</b> {item.coords[1]} <br />
                <b>Count:</b> {item.count}
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {paginatedData.map((item, i) => (
          <Circle
            key={`circle-${i}`}
            center={item.coords}
            radius={getRadius(item.count, zoomLevel)}
            color={getColor(item.count)}
            fillColor={getColor(item.count)}
            fillOpacity={0.4}
            weight={1.5}
          >
            <Tooltip>
              <b>Pincode:</b> {item.pincode} <br />
              <b>Count:</b> {item.count}
            </Tooltip>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapDashboard;
