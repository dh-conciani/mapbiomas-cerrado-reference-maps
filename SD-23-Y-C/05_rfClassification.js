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

// build a raster for the carta
var carta_img = ee.Image(1).clip(carta);

// read sentinel-2 mosaic
var mosaic = ee.ImageCollection('projects/nexgenmap/MapBiomas2/SENTINEL/mosaics-3')
  .filter(ee.Filter.eq('version', '3'))
  .filter(ee.Filter.eq('biome', 'CERRADO'))
  .filterBounds(carta);

// set reference year
var year = 2020;

// read training samples
var trainingSamples = ee.FeatureCollection('users/dh-conciani/gt_mapa_referencia/SD-23-Y-C/SD-23-Y-C_training_v1');

// compute aditional bands for thye sentinel-2 mosaic
var geo_coordinates = ee.Image.pixelLonLat().clip(carta);
// get latitude
var lat = geo_coordinates.select('latitude').add(5).multiply(-1).multiply(1000).toInt16();
// get longitude
var lon_sin = geo_coordinates.select('longitude').multiply(Math.PI).divide(180)
  .sin().multiply(-1).multiply(10000).toInt16().rename('longitude_sin');
// longitude cosine
var lon_cos = geo_coordinates.select('longitude').multiply(Math.PI).divide(180)
  .cos().multiply(-1).multiply(10000).toInt16().rename('longitude_cos');

// get heigth above nearest drainage
var hand = ee.ImageCollection('users/gena/global-hand/hand-100').mosaic().toInt16()
  .clip(carta).rename('hand');
  
// get the sentinel mosaic for the current year 
var mosaic_i = mosaic.filterMetadata('year', 'equals', 2020)
  .mosaic()
  .updateMask(carta_img)
  // add auxiliary bands
  .addBands(lat)
  .addBands(lon_sin)
  .addBands(lon_cos)
  .addBands(hand);
  
// train classifier
var classifier = ee.Classifier.smileRandomForest({
  'numberOfTrees': 300,
  'variablesPerSplit': 20
  }).train(trainingSamples, 'reference', mosaic_i.bandNames());

// perform classificationn 
var predicted = mosaic_i.classify(classifier).mask(mosaic_i.select(0)).rename('classification_' + year).toInt8();

// read palette
var vis = {
    'min': 0,
    'max': 62,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification8')
};

print(predicted);
Map.addLayer(predicted, vis, 'classification raw');
