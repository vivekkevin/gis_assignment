```markdown
# 🌍 Bengaluru Wards Explorer

An interactive **geospatial web application** that visualizes **BBMP wards, schools, trees, and elevation** data for Bengaluru.  
Built with **Mapbox GL JS, Turf.js, Chart.js, Express, and EJS**.

---

## 🚀 Features

- 🗺️ Interactive Mapbox map with wards, schools, and trees  
- 📊 Ward analytics panel (schools, trees, average elevation)  
- 🌳 Tree-type pie chart (powered by Chart.js)  
- 🏫 School clustering (25–250+)  
- 🏔️ Digital Elevation Model (DEM) overlay, hillshade & 3D terrain  
- 📌 Interactive popups for schools, trees, and wards  
- 🎛️ Toggle panel, legend, and layers with UI controls  
- ⌨️ Keyboard shortcuts:  
  - `P` → Toggle Analytics Panel  
  - `H` → Toggle Legend  
  - `ESC` → Close Popup  

---

## 📂 Project Structure

```

bengaluru-gis/
├─ public/                # Static files served to client
│  ├─ data/
│  │  ├─ trees/           # Tree GeoJSONs (east/south/west zones)
│  │  ├─ ward/            # BBMP ward boundaries GeoJSON
│  │  ├─ school/          # Schools GeoJSON
│  │  └─ dem/             # DEM overlay (PNG)
│  └─ css/js/images/      # (if needed)
│
├─ src/
│  └─ server.js           # Express backend
│
├─ views/
│  └─ map.ejs             # Map UI template
│
├─ .env                   # Environment variables (MAPBOX token)
├─ package.json           # Dependencies + scripts
└─ README.md              # Project documentation

````

---

## ⚙️ Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd bengaluru-gis
````

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root:

   ```env
   MAPBOX_TOKEN=your_mapbox_access_token - use the token - "pk.eyJ1Ijoidml2ZWtrZXZpbiIsImEiOiJjbTZodWY5NTgwMThrMmtzaXBidmJ2YjZmIn0.rpkBRl6Zl4vb9JOWMf77_w"
   PORT=3000
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

---

## ▶️ Usage

* Open the app in your browser:
  👉 [http://localhost:3000/map](http://localhost:3000/map)

* Explore:

  * Click wards → See schools, trees & elevation
  * Toggle panels & legend
  * Enable/disable DEM overlay, 3D terrain, and hillshade

---

## 📦 Dependencies

* [Express](https://expressjs.com/) (server & routes)
* [EJS](https://ejs.co/) (templating)
* [dotenv](https://www.npmjs.com/package/dotenv) (environment config)
* [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) (interactive maps)
* [Turf.js](https://turfjs.org/) (geospatial analytics)
* [Chart.js](https://www.chartjs.org/) (analytics charts)
* [GeoTIFF.js](https://geotiffjs.github.io/) (DEM reading in browser)

---

## 📌 Notes

* Ensure you have a valid **Mapbox access token** in `.env`.
* DEM overlay PNG (`nasadem_merge.png`) should match the correct bounding box.
* Data files (`.geojson`, `.png`) should be placed under `public/data/`.

---

## 🛠️ Future Improvements

* Add filtering by **school type** and **tree species**
* Ward-level **time-series analysis** for tree count changes

---

## 👨‍💻 Author

Developed by **Vivek Sridhar**

---

## 📝 License

MIT License – free to use and modify.

```
