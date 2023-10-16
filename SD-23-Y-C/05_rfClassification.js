// Run smileRandomForest classifier 
// For clarification, write to <dhemerson.costa@ipam.org.br> 

// define ibges' carta id
var id_carta = 'SD-23-Y-C';

// define strings to be used as metadata
var samples_version = 1;   // input training samples version
var output_version =  1;  // output classification version 

// output directory
var output_dir = 'users/dh-conciani/gt_mapa_referencia/' + id_carta;

// read study area
var carta = ee.FeatureCollection('projects/nexgenmap/ANCILLARY/nextgenmap_grids')
  .filterMetadata('grid_name', 'equals', id_carta)
  // compute 300m buffer
  .map(function(feature) {
    return feature.buffer({'distance': 300});
  });
