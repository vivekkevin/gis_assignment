
    // === Config ===
    mapboxgl.accessToken = window.MAPBOX_TOKEN;

    // Tree type field preferences (fallbacks tried in this order)
    const TREE_FIELDS = ['TreeName', 'TreeName', 'KGISTreeID', 'type', 'Type', 'tree', 'Tree'];

    // Sources to load with enhanced configuration
    const files = [
      { 
        url: '/data/trees/blr_east_zone_tree.geojson',  
        color: '#3b82f6', 
        id: 'layer1', 
        label: 'East Zone Trees',
        description: 'Tree data from East Bengaluru'
      },
      { 
        url: '/data/trees/blr_south_zone_tree.geojson', 
        color: '#27F5E4', 
        id: 'layer2', 
        label: 'South Zone Trees',
        description: 'Tree data from South Bengaluru'
      },
      { 
        url: '/data/trees/blr_west_zone_tree.geojson',  
        color: '#10b981', 
        id: 'layer3', 
        label: 'West Zone Trees',
        description: 'Tree data from West Bengaluru'
      },
      { 
        url: '/data/ward/BBMP.geojson',                 
        color: '#7c3aed', 
        id: 'bbmp',   
        label: 'BBMP Wards',
        description: 'Administrative ward boundaries'
      }
    ];

    // SINGLE popup instance to prevent multiple popups
    const popup = new mapboxgl.Popup({ 
      closeButton: true, 
      closeOnClick: true,
      maxWidth: '300px'
    });

    // Interactive layers in priority order (higher priority = first in array)
    const INTERACTIVE_LAYERS = [
      'schools-clusters',     // highest priority
      'schools-unclustered',  
      'layer1-point',         // trees
      'layer2-point', 
      'layer3-point',
      'bbmp-fill'            // lowest priority (wards)
    ];

    // Caches
    let treesFC = { type:'FeatureCollection', features: [] };
    let schoolsFC = null;
    let pieChart = null;
    let loadingSteps = 0;
    let totalSteps = files.length + 2; // files + schools + DEM

    const PIE_COLORS = ['#60a5fa','#f87171','#34d399','#fbbf24','#a78bfa','#22d3ee','#fb7185','#a3e635','#f472b6','#2dd4bf','#fda4af'];

    // UI Functions
    function togglePanel() {
      const panel = document.getElementById('panel');
      const button = panel.querySelector('.panel-toggle');
      panel.classList.toggle('collapsed');
      button.textContent = panel.classList.contains('collapsed') ? '▶' : '◀';
    }

    function toggleLegend() {
      const legend = document.getElementById('legend');
      const button = legend.querySelector('.legend-toggle');
      legend.classList.toggle('collapsed');
      button.textContent = legend.classList.contains('collapsed') ? '▲' : '▼';
    }

    function updateLoadingProgress() {
      loadingSteps++;
      const progress = Math.round((loadingSteps / totalSteps) * 100);
      const loadingEl = document.getElementById('loading');
      if (loadingEl) {
        loadingEl.querySelector('span').textContent = `Loading map data... ${progress}%`;
        if (loadingSteps >= totalSteps) {
          setTimeout(() => loadingEl.remove(), 500);
        }
      }
    }

    // Build map
    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [77.5946, 12.9716],
      zoom: 10
    });
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Left controls
    const controlsContainer = document.createElement('div');
    
    // Layer controls
    const layerToggle = document.createElement('div');
    layerToggle.className = 'mapboxgl-ctrl mapboxgl-ctrl-group ctrl';
    
    const layerHeader = document.createElement('h4');
    layerHeader.textContent = 'Data Layers';
    layerToggle.appendChild(layerHeader);

    // Data layer checkboxes
    for (const { id, label, description } of files) {
      const wrap = document.createElement('label');
      wrap.title = description || label;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.dataset.layer = id;
      const span = document.createElement('span');
      span.textContent = label || id;
      wrap.appendChild(cb);
      wrap.appendChild(span);
      layerToggle.appendChild(wrap);
    }

    // Terrain controls
    const terrainToggle = document.createElement('div');
    terrainToggle.className = 'mapboxgl-ctrl mapboxgl-ctrl-group ctrl';
    
    const terrainHeader = document.createElement('h4');
    terrainHeader.textContent = 'Terrain & Elevation';
    terrainToggle.appendChild(terrainHeader);

    [
      ['nasadem_merge', 'DEM Overlay', 'NASA Digital Elevation Model'],
      ['terrain3d', '3D Terrain', 'Enable 3D terrain visualization'],
      ['hillshade', 'Hillshade', 'Terrain shading effect']
    ].forEach(([id, label, description]) => {
      const wrap = document.createElement('label');
      wrap.title = description;
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.dataset.layer = id;
      const span = document.createElement('span');
      span.textContent = label;
      wrap.appendChild(cb);
      wrap.appendChild(span);
      terrainToggle.appendChild(wrap);
    });

    controlsContainer.appendChild(layerToggle);
    controlsContainer.appendChild(terrainToggle);

    // Toggle handler with enhanced feedback
    function setVisibilityForSet(base, visible) {
      const vis = visible ? 'visible' : 'none';
      ['-fill', '-line', '-point'].forEach(suffix => {
        const lid = `${base}${suffix}`;
        if (map.getLayer(lid)) map.setLayoutProperty(lid, 'visibility', vis);
      });
      if (map.getLayer(base)) map.setLayoutProperty(base, 'visibility', vis);
      
      // Special handling for schools
      if (base === 'schools') {
        ['schools-clusters', 'schools-cluster-count', 'schools-unclustered'].forEach(lid => {
          if (map.getLayer(lid)) map.setLayoutProperty(lid, 'visibility', vis);
        });
      }
    }

    controlsContainer.addEventListener('change', (e) => {
      const t = e.target;
      if (!(t && t.matches('input[type="checkbox"][data-layer]'))) return;

      if (t.dataset.layer === 'terrain3d') {
        if (t.checked) {
          map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.4 });
          if (map.getPitch() < 30) map.easeTo({ pitch: 60, bearing: -20, duration: 800 });
        } else {
          map.setTerrain(null);
          map.easeTo({ pitch: 0, duration: 800 });
        }
      } else if (t.dataset.layer === 'hillshade') {
        const vis = t.checked ? 'visible' : 'none';
        if (map.getLayer('hillshade')) map.setLayoutProperty('hillshade', 'visibility', vis);
      } else {
        setVisibilityForSet(t.dataset.layer, t.checked);
      }
    });

    map.addControl({ 
      onAdd: () => controlsContainer, 
      onRemove: () => controlsContainer.remove() 
    }, 'top-left');

    // Enhanced chart helper
    function updatePie(counts) {
      const labels = Object.keys(counts);
      const data = labels.map(k => counts[k]);
      const total = data.reduce((sum, val) => sum + val, 0);
      
      const ctx = document.getElementById('tree-pie').getContext('2d');
      if (pieChart) pieChart.destroy();
      
      pieChart = new Chart(ctx, {
        type: 'pie',
        data: { 
          labels: labels.map(label => label.length > 15 ? label.substring(0, 15) + '...' : label), 
          datasets: [{ 
            data, 
            backgroundColor: labels.map((_,i) => PIE_COLORS[i % PIE_COLORS.length]),
            borderWidth: 1,
            borderColor: '#fff'
          }] 
        },
        options: { 
          responsive: true,
          plugins: { 
            legend: { 
              position: 'bottom',
              labels: { font: { size: 10 }, boxWidth: 12 }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const percentage = ((context.raw / total) * 100).toFixed(1);
                  return `${context.label}: ${context.raw} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }

    // Find the first existing tree name field on a feature
    function getTreeName(props) {
      for (const key of TREE_FIELDS) {
        if (props && props[key] != null && props[key] !== '') return props[key];
      }
      return 'Unknown';
    }

    // Extend bounds from a GeoJSON
    function extendBoundsFromGeoJSON(data, bounds) {
      function extend(coords) {
        if (!coords) return;
        if (Array.isArray(coords[0])) coords.forEach(extend);
        else if (typeof coords[0] === 'number' && typeof coords[1] === 'number') bounds.extend(coords);
      }
      (data.features || []).forEach(f => f.geometry && extend(f.geometry.coordinates));
    }

    // Average elevation from Mapbox DEM with performance optimization
    async function meanElevationInPolygon(wardFeature, stepMeters = 250) {
      const bbox = turf.bbox(wardFeature);
      const area = turf.area(wardFeature);
      
      // Adjust step size based on area for performance
      const adaptiveStep = area < 1000000 ? 150 : area < 5000000 ? 250 : 350;
      const grid = turf.pointGrid(bbox, adaptiveStep, { units: 'meters', mask: wardFeature });

      let sum = 0, n = 0;
      const batchSize = 50; // Process in batches to avoid blocking
      
      for (let i = 0; i < grid.features.length; i += batchSize) {
        const batch = grid.features.slice(i, i + batchSize);
        for (const pt of batch) {
          const [lng, lat] = pt.geometry.coordinates;
          const z = map.queryTerrainElevation({ lng, lat }, { exaggerated: false });
          if (Number.isFinite(z)) { sum += z; n++; }
        }
        // Yield control occasionally for large areas
        if (i % (batchSize * 10) === 0) await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      return n ? (sum / n) : NaN;
    }

    // === ENHANCED UNIFIED CLICK HANDLER ===
    function handleMapClick(e) {
      // Query all interactive features at click point
      const features = map.queryRenderedFeatures(e.point, {
        layers: INTERACTIVE_LAYERS
      });

      if (features.length === 0) {
        // No interactive features - show elevation popup
        const z = map.queryTerrainElevation(e.lngLat, { exaggerated: false });
        if (Number.isFinite(z)) {
          popup.setLngLat(e.lngLat)
                .setHTML(`<div style="font:12px system-ui;padding:8px">
                  📏 <strong>Elevation:</strong> ${z.toFixed(1)} m
                </div>`)
                .addTo(map);
        }
        return;
      }

      // Find the highest priority feature
      let selectedFeature = null;
      let selectedLayer = null;
      
      for (const layer of INTERACTIVE_LAYERS) {
        const feature = features.find(f => f.layer.id === layer);
        if (feature) {
          selectedFeature = feature;
          selectedLayer = layer;
          break;
        }
      }

      if (!selectedFeature) return;

      // Handle based on feature type
      if (selectedLayer === 'schools-clusters') {
        // Expand cluster with smooth animation
        const clusterId = selectedFeature.properties.cluster_id;
        map.getSource('schools').getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          map.easeTo({ 
            center: selectedFeature.geometry.coordinates, 
            zoom: Math.min(zoom, 18),
            duration: 1000
          });
        });
        
      } else if (selectedLayer === 'schools-unclustered') {
        const props = selectedFeature.properties || {};
        
        const FIELDS = [
          ['School Name', 'name'],
          ['Type', 'type'],
          ['Operator', 'operator'],
          ['Phone', 'phone'],
          ['Email', 'email'],
          ['Website', 'website'],
          ['Religion', 'religion'],
          ['Grades', 'grades'],
          ['Opening Hours', 'opening_hours'],
          ['Street', 'addr:street'],
          ['Postcode', 'addr:postcode'],
          ['District', 'addr:district']
        ];

        const rows = FIELDS
          .map(([label, key]) => [label, props[key]])
          .filter(([_, val]) => val && val !== 'NULL' && val !== '');

        const html = `
          <div style="font:13px/1.4 system-ui,sans-serif; min-width:220px; max-width:280px; padding:4px;">
            <div style="font-weight:600; font-size:14px; margin-bottom:8px; color:#1f2937; border-bottom:2px solid #e5e7eb; padding-bottom:6px;">
              🏫 ${props.name || 'School'}
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              ${rows.map(([label, val]) => `
                <tr>
                  <td style="padding:4px 6px; color:#6b7280; vertical-align:top; white-space:nowrap;">${label}</td>
                  <td style="padding:4px 6px; font-weight:500; word-break:break-word;">${val}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        `;

        popup.setLngLat(selectedFeature.geometry.coordinates).setHTML(html).addTo(map);
        
      } else if (selectedLayer.includes('-point')) {
        // Enhanced tree popup
        const props = selectedFeature.properties || {};
        const name = props.TreeName || getTreeName(props);

        const html = `
          <div style="font: 13px/1.4 system-ui, sans-serif; padding:12px 14px; max-width:280px;">
            <div style="font-size:14px; font-weight:600; margin-bottom:8px; color:#111827; border-bottom:1px solid #e5e7eb; padding-bottom:6px; display:flex; align-items:center; gap:6px;">
              🌳 ${name}
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:12px;">
              ${[
                ['Tree ID', props.OBJECTID || props.KGISTreeID],
                ['Department', props.DepartmentCode],
                ['Ward', props.WardNumber || props.Ward_No],
                ['Village ID', props.KGISVillageID],
                ['Height', props.height ? `${props.height} m` : null],
                ['DBH', props.dbh ? `${props.dbh} cm` : null]
              ].filter(([_,v]) => v).map(([k,v]) => `
                <tr>
                  <td style="padding:4px 6px; color:#6b7280; white-space:nowrap;">${k}</td>
                  <td style="padding:4px 6px; text-align:right; font-weight:500; color:#111827;">${v}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        `;

        popup.setLngLat(selectedFeature.geometry.coordinates).setHTML(html).addTo(map);
        
      } else if (selectedLayer === 'bbmp-fill') {
        // Handle ward click
        handleWardClick(selectedFeature, e.lngLat);
      }
    }

    // Enhanced ward click handler
    async function handleWardClick(ward, lngLat) {
      const props = ward.properties || {};

      // Highlight the clicked polygon
      if (typeof ward.id === 'number' || typeof ward.id === 'string') {
        const sel = ['==', ['id'], ward.id];
        if (map.getLayer('bbmp-highlight')) map.setFilter('bbmp-highlight', sel);
        if (map.getLayer('bbmp-highlight-fill')) map.setFilter('bbmp-highlight-fill', sel);
      }

      // Update panel with loading states
      const wardNo = props.KGISWardNo ?? props.ward_no ?? props.Ward_No ?? props.WARDNO ?? null;
      const wardName = props.KGISWardName ?? props.ward_name ?? props.name ?? props.Ward_Name ?? (wardNo ? `Ward #${wardNo}` : '—');
      
      document.getElementById('ward-name').textContent = wardName;
      document.getElementById('ward-schools').textContent = '...';
      document.getElementById('ward-trees').textContent = '...';
      document.getElementById('ward-elev').textContent = '...';

      // Trees inside → pie and count
      const treesInside = treesFC.features.length ? turf.pointsWithinPolygon(treesFC, ward) : { features: [] };
      const treeCount = treesInside.features.length;
      document.getElementById('ward-trees').textContent = treeCount;
      
      const counts = {};
      for (const f of treesInside.features) {
        const name = getTreeName(f.properties || {});
        counts[name] = (counts[name] || 0) + 1;
      }
      updatePie(counts);

      // Schools inside → count
      let schoolCount = 0;
      if (schoolsFC) {
        schoolCount = turf.pointsWithinPolygon(schoolsFC, ward).features.length;
      }
      document.getElementById('ward-schools').textContent = schoolCount;

      // Avg elevation (async with progress)
      const avg = await meanElevationInPolygon(ward);
      document.getElementById('ward-elev').textContent = Number.isFinite(avg) ? avg.toFixed(1) : '—';

      // Enhanced ward popup
      const area = (turf.area(ward) / 1000000).toFixed(2); // km²
      const density = schoolCount > 0 ? (schoolCount / parseFloat(area)).toFixed(1) : '0';
      
      const html = `
        <div style="font: 12px/1.4 system-ui, sans-serif; min-width:200px;">
          <div style="font-weight:600; font-size:14px; margin-bottom:8px; color:#1f2937; border-bottom:2px solid #e5e7eb; padding-bottom:4px;">
            🏛️ ${wardName}
          </div>
          <table style="border-collapse:collapse; font-size:11px; width:100%;">
            ${[
              ['Ward No.', wardNo],
              ['Ward ID', props.KGISWardID],
              ['Area', `${area} km²`],
              ['Schools', schoolCount],
              ['School density', `${density}/km²`],
              ['Trees', treeCount],
              ['Avg elevation', Number.isFinite(avg) ? `${avg.toFixed(1)} m` : '—']
            ].filter(([_, v]) => v !== undefined && v !== null && v !== '').map(([k,v]) => `
              <tr>
                <td style="padding:3px 8px 3px 0; color:#6b7280;">${k}</td>
                <td style="padding:3px 0; font-weight:500; text-align:right;">${v}</td>
              </tr>`).join('')}
          </table>
        </div>
      `;

      popup.setLngLat(lngLat).setHTML(html).addTo(map);
    }

    // Enhanced cursor management
    function setupCursorHandlers() {
      INTERACTIVE_LAYERS.forEach(layerId => {
        map.on('mouseenter', layerId, (e) => {
          map.getCanvas().style.cursor = 'pointer';
          
          // Add subtle hover effects
          if (layerId === 'bbmp-fill') {
            map.setPaintProperty('bbmp-fill', 'fill-opacity', 0.3);
          }
        });
        
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
          
          if (layerId === 'bbmp-fill') {
            map.setPaintProperty('bbmp-fill', 'fill-opacity', 0.18);
          }
        });
      });
    }

    // === ENHANCED MAP LOAD ===
    map.on('load', async () => {
      const bounds = new mapboxgl.LngLatBounds();

      try {
        // Load schools data with progress tracking
        try {
          const schoolsResp = await fetch('/data/school/Overpass_school.geojson');
          if (schoolsResp.ok) {
            schoolsFC = await schoolsResp.json();
            console.log(`Loaded ${schoolsFC.features?.length || 0} schools`);
          }
          updateLoadingProgress();
        } catch (e) {
          console.warn('Could not load schools:', e);
          updateLoadingProgress();
        }

        // Load declared files with enhanced error handling
        for (const { url, color, id, label } of files) {
          try {
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
            const data = await resp.json();

            console.log(`Loaded ${label}: ${data.features?.length || 0} features`);

            // Collect tree points for analysis
            if (id === 'layer1' || id === 'layer2' || id === 'layer3') {
              const pts = (data.features || []).filter(f => f.geometry?.type === 'Point');
              treesFC.features.push(...pts);
            }

            // Add source with enhanced options
            const sourceOptions = { type: 'geojson', data };
            if (id === 'bbmp') sourceOptions.generateId = true;
            if (id.includes('layer')) sourceOptions.cluster = false; // Disable clustering for tree layers
            
            map.addSource(id, sourceOptions);

            // Add enhanced layers with better styling
            map.addLayer({
              id: `${id}-fill`,
              type: 'fill',
              source: id,
              filter: ['==', ['geometry-type'], 'Polygon'],
              paint: { 
                'fill-color': color, 
                'fill-opacity': id === 'bbmp' ? 0.18 : 0.25,
                'fill-outline-color': color
              }
            });

            map.addLayer({
              id: `${id}-line`,
              type: 'line',
              source: id,
              paint: { 
                'line-color': color, 
                'line-width': id === 'bbmp' ? 1.5 : 1.2,
                'line-opacity': 0.8
              }
            });

            map.addLayer({
              id: `${id}-point`,
              type: 'circle',
              source: id,
              filter: ['==', ['geometry-type'], 'Point'],
              paint: {
                'circle-radius': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10, 3,
                  15, 6,
                  18, 8
                ],
                'circle-color': color,
                'circle-stroke-width': 1,
                'circle-stroke-color': '#ffffff',
                'circle-opacity': 0.8
              }
            });

            // Add highlight layers for wards with enhanced styling
            if (id === 'bbmp') {
              map.addLayer({
                id: 'bbmp-highlight-fill',
                type: 'fill',
                source: 'bbmp',
                filter: ['==', ['id'], -1],
                paint: { 
                  'fill-color': '#fde68a', 
                  'fill-opacity': 0.4,
                  'fill-outline-color': '#f59e0b'
                }
              }, 'bbmp-line');

              map.addLayer({
                id: 'bbmp-highlight',
                type: 'line',
                source: 'bbmp',
                filter: ['==', ['id'], -1],
                paint: { 
                  'line-color': '#f59e0b', 
                  'line-width': 4,
                  'line-opacity': 0.9
                }
              });
            }

            extendBoundsFromGeoJSON(data, bounds);
            updateLoadingProgress();
            
          } catch (err) {
            console.error(`Failed to load ${label}:`, err);
            updateLoadingProgress();
          }
        }

        console.log(`Total trees loaded: ${treesFC.features.length}`);

        // Enhanced schools clustered layers with better styling
        if (schoolsFC) {
          map.addSource('schools', {
            type: 'geojson',
            data: schoolsFC,
            cluster: true, 
            clusterRadius: 50, 
            clusterMaxZoom: 14,
            clusterProperties: {
              'total': ['+', ['get', 'count']]
            }
          });

          map.addLayer({
            id: 'schools-clusters',
            type: 'circle',
            source: 'schools',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step', 
                ['get', 'point_count'],
                '#9ae6b4', 10,
                '#4ade80', 25, 
                '#22c55e', 50,
                '#16a34a', 100,
                '#15803d'
              ],
              'circle-radius': [
                'step', 
                ['get', 'point_count'],
                15, 10,
                20, 25, 
                25, 50,
                30, 100,
                35
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.8
            }
          });

          map.addLayer({
            id: 'schools-cluster-count',
            type: 'symbol',
            source: 'schools',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': ['get', 'point_count_abbreviated'],
              'text-size': [
                'step',
                ['get', 'point_count'],
                12, 25,
                14, 100,
                16
              ],
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold']
            },
            paint: { 
              'text-color': '#1f2937',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1
            }
          });

          map.addLayer({
            id: 'schools-unclustered',
            type: 'circle',
            source: 'schools',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                10, 4,
                15, 6,
                18, 8
              ],
              'circle-color': '#F54927',
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 0.85
            }
          });
        }

        // Enhanced DEM overlays with better integration
        const beforeId = map.getLayer('layer1-point') ? 'layer1-point' : undefined;

        // Add DEM overlay with proper coordinates for Bengaluru
        map.addSource('nasadem_merge', {
          type: 'image',
          url: '/data/dem/nasadem_merge.png',
          coordinates: [
            [77.4598611, 13.1426389],  // top-left
            [77.7843056, 13.1426389],  // top-right
            [77.7843056, 12.8334722],  // bottom-right
            [77.4598611, 12.8334722]   // bottom-left
          ]
        });
        
        map.addLayer({
          id: 'nasadem_merge',
          type: 'raster',
          source: 'nasadem_merge',
          paint: { 
            'raster-opacity': 0.6,
            'raster-fade-duration': 300
          }
        }, beforeId);

        // Mapbox DEM source for 3D terrain
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14
        });

        // Enhanced 3D terrain with smooth transitions
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.4 });
        map.easeTo({ 
          pitch: 60, 
          bearing: -20, 
          duration: 1200,
          easing: t => t * (2 - t) // easeOutQuad
        });

        // Enhanced hillshade with better visibility
        map.addLayer({
          id: 'hillshade',
          type: 'hillshade',
          source: 'mapbox-dem',
          layout: { visibility: 'visible' },
          paint: { 
            'hillshade-exaggeration': 0.8,
            'hillshade-shadow-color': '#1f2937',
            'hillshade-highlight-color': '#f9fafb',
            'hillshade-illumination-direction': 315
          }
        });

        // Enhanced sky layer for better 3D effect
        map.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun-intensity': 8,
            'sky-atmosphere-sun': [0.0, 90.0],
            'sky-atmosphere-halo-color': 'rgba(85, 151, 210, 0.5)'
          }
        });

        updateLoadingProgress();

        // Fit to content with padding
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { 
            padding: { top: 50, bottom: 50, left: 320, right: 50 },
            maxZoom: 13,
            duration: 1500
          });
        }

        // Apply initial toggle states
        controlsContainer.querySelectorAll('input[data-layer]').forEach(cb => {
          const layerBase = cb.dataset.layer;
          if (layerBase === 'terrain3d' || layerBase === 'hillshade') return;
          setVisibilityForSet(layerBase, cb.checked);
        });

        // Setup enhanced cursor handlers
        setupCursorHandlers();

        // Setup unified click handler
        map.on('click', handleMapClick);

        // Add keyboard shortcuts
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            popup.remove();
          } else if (e.key === 'h' || e.key === 'H') {
            toggleLegend();
          } else if (e.key === 'p' || e.key === 'P') {
            togglePanel();
          }
        });

        console.log('Map initialization complete!');
        
      } catch (error) {
        console.error('Error during map initialization:', error);
        document.getElementById('loading').innerHTML = `
          <div style="color: #dc2626; text-align: center;">
            <strong>⚠️ Error loading map</strong><br>
            <small>${error.message}</small>
          </div>
        `;
      }
    });

    // Add resize handler for responsive design
    window.addEventListener('resize', () => {
      map.resize();
    });

    // Add error handling for map
    map.on('error', (e) => {
      console.error('Map error:', e.error);
    });

    // Performance monitoring
    map.on('data', (e) => {
      if (e.isSourceLoaded) {
        console.log(`Source loaded: ${e.sourceId}`);
      }
    });

    // Initial welcome message
    setTimeout(() => {
      if (document.getElementById('loading')) return; // Still loading
      
      const welcomePopup = new mapboxgl.Popup({
        closeOnClick: true,
        closeButton: true,
        maxWidth: '320px'
      })
      .setLngLat([77.5946, 12.9716])
      .setHTML(`
        <div style="font: 13px/1.4 system-ui, sans-serif; text-align: center; padding: 8px;">
          <h3 style="margin: 0 0 8px; color: #1f2937;">🌟 Welcome to Bengaluru Ward Explorer</h3>
          <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px;">
            Explore trees, schools, and elevation data across BBMP wards
          </p>
          <div style="font-size: 11px; color: #9ca3af;">
            💡 Click wards for details • Press 'H' for legend • Press 'P' for panel
          </div>
        </div>
      `)
      .addTo(map);
      
      setTimeout(() => welcomePopup.remove(), 5000);
    }, 2000);

  // Demo overlay logic
  document.addEventListener("DOMContentLoaded", () => {
    const demoOverlay = document.getElementById("demo-overlay");
    const startBtn = document.getElementById("start-demo");

    if (localStorage.getItem("demoShown")) {
      // Already seen → hide immediately
      demoOverlay.style.display = "none";
    } else {
      // Show demo until user clicks
      startBtn.addEventListener("click", () => {
        demoOverlay.style.display = "none";
        localStorage.setItem("demoShown", "true");
        // Show the normal loading spinner now
        document.getElementById("loading").style.display = "flex";
      });
      // Hide loading spinner until demo dismissed
      document.getElementById("loading").style.display = "none";
    }
  });

