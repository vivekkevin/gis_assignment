REM Option 1 (most common 64-bit)
"C:\OSGeo4W64\bin\saga_cmd.exe" ta_preprocessor 4 ^
  -ELEV dem_clipped.tif ^
  -FILLED dem_filled.sdat ^
  -MINSLOPE 0.01

"C:\OSGeo4W64\bin\saga_cmd.exe" ta_hydrology 0 ^
  -ELEVATION dem_filled.sdat ^
  -METHOD 4 -CONVERGENCE 1.1 ^
  -FLOW flowdir.sdat ^
  -AREA flowacc.sdat

"C:\OSGeo4W64\bin\saga_cmd.exe" ta_channels 0 ^
  -ELEVATION dem_filled.sdat ^
  -INIT_METHOD 1 -INIT_GRID flowacc.sdat -INIT_VALUE 3000 ^
  -DIV_CELLS 0 -MINLEN 0 ^
  -CHNLNTWRK channels_grid.sdat ^
  -BASINS basins.sdat

"C:\OSGeo4W64\bin\saga_cmd.exe" shapes_grid 6 ^
  -GRID channels_grid.sdat ^
  -POLYGONS 0 -CONTOUR 0.5 ^
  -OUTPUT channels_lines.shp
