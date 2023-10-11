// get training mask to perform the land cover and land use classification 
// dhemerson.costa@ipam.org.br - ipam 

// read study area
var carta = ee.FeatureCollection('projects/nexgenmap/ANCILLARY/nextgenmap_grids')
  .filterMetadata('grid_name', 'equals', 'SD-23-Y-C');

// split into subgrids 
var subcarta = ee.FeatureCollection('projects/nexgenmap/ANCILLARY/nextgenmap_subgrids')
    .filterMetadata('grid', 'equals', 'SD-23-Y-C');

//// read mapbiomas collections
// sentinel based 
var sentinel = ee.Image('projects/mapbiomas-workspace/public/collection_S2_beta/collection_LULC_S2_beta')
  .clip(carta);

// landsat based
var landsat = ee.Image('projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1')
  .clip(carta);

//// read reference data
// 








// read palette
var vis = {
    'min': 0,
    'max': 62,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification8')
};

// 
Map.addLayer(carta);
Map.addLayer(sentinel.select('classification_2020'), vis, 'Sentinel');
Map.addLayer(landsat.select('classification_2020'), vis, 'Landsat');

