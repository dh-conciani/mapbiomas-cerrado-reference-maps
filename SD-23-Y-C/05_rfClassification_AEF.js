// Run smileRandomForest classifier 
// For clarification, write to <dhemerson.costa@ipam.org.br> 

// define ibges' carta id
var id_carta = 'SD-23-Y-C';

// set platform
var platform = 'AEF';

// define strings to be used as metadata
var samples_version = 1;   // input training samples version
var output_version =  1;  // output classification version 

// set frequency of classes
var rareList =  [9, 25];  // use a reduced number of training samples (25% of minimum, 1.75% of total)
var rareList2 = [33]; // use a reduced number of training samples (50% of minimum, 3.5% of total)
var rareList3 = [11]; // use a reduced number of training samples (75% of minimum, 5.25% of total)
var normalList = [3, 4, 12, 15, 19];

// output directory
var output_dir = 'users/dh-conciani/gt_mapa_referencia/embeddings';

// read study area
var carta = ee.FeatureCollection('projects/nexgenmap/ANCILLARY/nextgenmap_grids')
  .filterMetadata('grid_name', 'equals', id_carta)
  // compute 300m buffer
  .map(function(feature) {
    return feature.buffer({'distance': 300});
});

// build a raster for the carta
var carta_img = ee.Image(1).clip(carta);

// read mosaic
var mosaic = ee.ImageCollection('GOOGLE/SATELLITE_EMBEDDING/V1/ANNUAL');

// set reference year
var year = 2020;

// read training samples
var trainingSamples = ee.FeatureCollection('users/dh-conciani/gt_mapa_referencia/embeddings/SD-23-Y-C_AEF_training_v1');

// get the sentinel mosaic for the current year 
var mosaic_i = mosaic
  .filterDate(year + '-01-01', year+1 + '-01-01')
  .filterBounds(carta)
  .first();


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
    'max': 75,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification10')
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

// export
Export.image.toAsset({
	image: predicted2,
  description: id_carta + '_classification_' + platform + '_v1',
  assetId: output_dir + '/' + id_carta + '_classification_' + platform + '_v1',
  pyramidingPolicy: 'mode',
  region: carta.geometry(),
  scale: 10,
  maxPixels: 1e13});
