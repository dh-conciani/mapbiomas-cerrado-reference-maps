// Run smileRandomForest classifier 
// For clarification, write to <dhemerson.costa@ipam.org.br> 

// define ibges' carta id
var id_carta = 'SD-23-Y-C';

// define strings to be used as metadata
var samples_version = 1;   // input training samples version
var output_version =  1;  // output classification version 

// set frequency of classes
var rareList =  [9, 36, 24, 25, 30];  // use a reduced number of training samples (25% of minimum, 1.75% of total)
var rareList2 = [21, 33]; // use a reduced number of training samples (50% of minimum, 3.5% of total)
var rareList3 = [11]; // use a reduced number of training samples (75% of minimum, 5.25% of total)
var normalList = [3, 4, 12, 15, 19];

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

print('raw - unbalanced', predicted);
Map.addLayer(predicted, vis, 'unbalanced');

///////////////////////////// BALANCE SAMPLES

// limit samples of rare classes for 25% of relative (1.75% percent of total)
var rareClasses = ee.FeatureCollection([]);
rareList.forEach(function(class_i){
  rareClasses = rareClasses.merge(trainingSamples.filter(ee.Filter.eq('reference', class_i)).limit(175));
});

// limit samples of rare classes for 50% of relative (3.5% percent of total)
var rareClasses2 = ee.FeatureCollection([]);
rareList2.forEach(function(class_i){
  rareClasses2 = rareClasses2.merge(trainingSamples.filter(ee.Filter.eq('reference', class_i)).limit(300));
});

// limit samples of rare classes for 75% of relative (5.25% percent of total)
var rareClasses3 = ee.FeatureCollection([]);
rareList3.forEach(function(class_i){
  rareClasses3 = rareClasses3.merge(trainingSamples.filter(ee.Filter.eq('reference', class_i)).limit(525));
});


// bind manually adjusted rare classes with normal classes (real frequency)
var trainingSamples2 = trainingSamples.filter(ee.Filter.inList('reference', normalList))
  .merge(rareClasses).merge(rareClasses2).merge(rareClasses3);
  
///////////////////////////// END OF SAMPLE BALANCING


// train classifier
var classifier2 = ee.Classifier.smileRandomForest({
  'numberOfTrees': 300,
  'variablesPerSplit': 20
  }).train(trainingSamples2, 'reference', mosaic_i.bandNames());


// perform classificationn 
var predicted2 = mosaic_i.classify(classifier2).mask(mosaic_i.select(0)).rename('classification_' + year).toInt8();

print('v2- balanced', predicted2);
Map.addLayer(predicted2, vis, 'balanced');
