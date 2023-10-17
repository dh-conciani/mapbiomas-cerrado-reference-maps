// apply segmentation 
// dhemerson.costa@ipam.org.br

// set ibges id
var id_carta = 'SD-23-Y-C';

// define output version
var output_version = 1; 

// output directory
var output_dir = 'users/dh-conciani/gt_mapa_referencia/' + id_carta;

// read collection 
var classification = ee.Image('users/dh-conciani/gt_mapa_referencia/SD-23-Y-C/SD-23-Y-C_classification_v1');

// read segments
var segments = ee.Image('users/dh-conciani/gt_mapa_referencia/SD-23-Y-CSD-23-Y-C_segments_v1');

// read study area
var carta = ee.FeatureCollection('projects/nexgenmap/ANCILLARY/nextgenmap_grids')
  .filterMetadata('grid_name', 'equals', id_carta)
  // compute 300m buffer
  .map(function(feature) {
    return feature.buffer({'distance': 300});
});

// compute the mode class 
var mode = segments.addBands(classification)
                      .reduceConnectedComponents({
                        'reducer': ee.Reducer.mode(), 
                        'labelBand': 'segments'
                        }
                      ).reproject('EPSG:4326', null, 10)
                    .rename('mode')
                    .clip(carta);
                 
// read palette
var vis = {
    'min': 0,
    'max': 62,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification8')
};

Map.addLayer(classification, vis, 'classification');
Map.addLayer(mode, vis, 'classification + segmentation');

// Export segments
Export.image.toAsset({
	image: mode,
  description: id_carta + '_segmentMode_v' + output_version,
  assetId: output_dir + id_carta + '_segmentsMode_v' + output_version,
  pyramidingPolicy: 'mode',
  region: classification.geometry(),
  scale: 10,
  maxPixels: 1e13,
});

