// visualize 
// dhemerson.costa@ipam.org.br

// set ibges id
var id_carta = 'SD-23-Y-C';

// define output version
var version = 1; 

// output directory
var input_dir = 'users/dh-conciani/gt_mapa_referencia/' + id_carta;

// read collection 
var classification = ee.Image('users/dh-conciani/gt_mapa_referencia/' + id_carta + '/' + id_carta + '_classification_v' + version);

// read segments
var segments = ee.Image('users/dh-conciani/gt_mapa_referencia/' + id_carta + '/' + id_carta + '_segments_v' + version);

// read enhanced by segments
var mode = ee.Image('users/dh-conciani/gt_mapa_referencia/' + id_carta + '/' + id_carta + '_segmentsMode_v' + version);

// collection sentinel beta
var sentinel_beta = ee.Image('projects/mapbiomas-workspace/public/collection_S2_beta/collection_LULC_S2_beta')
  .select('classification_2020')
    .updateMask(mode);

// read sentinel-2 mosaic
var mosaic = ee.ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics-3')
  .filter(ee.Filter.eq('version', '3'))
  .filter(ee.Filter.eq('biome', 'CERRADO'))
  .filter(ee.Filter.eq('year', 2020))
  .mosaic()
  .updateMask(mode);

                 
// read palette
var vis = {
    'min': 0,
    'max': 62,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification8')
};

// plot s
Map.addLayer(mosaic, {'bands': ['swir1_median', 'nir_median', 'red_median'],
  'gain': [0.08, 0.07, 0.2], 'gamma': 0.85}, 'Sentinel Mosaic', true);
Map.addLayer(sentinel_beta, vis, 'sentnel beta', false);
Map.addLayer(classification, vis, 'classification raw', false);
Map.addLayer(segments.randomVisualizer(), {}, 'segments', false);
Map.addLayer(mode, vis, 'classification + segmentation');

