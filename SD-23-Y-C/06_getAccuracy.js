// get accuracy of the tests

var col10 = ee.Image('projects/mapbiomas-public/assets/brazil/lulc/collection10/mapbiomas_brazil_collection10_integration_v2')
  .select('classification_2020')
  .remap({
    'from': [3, 4, 5, 6, 49, 11, 12, 29, 50, 13, 15, 19, 39, 20, 40, 62, 41, 46, 47, 35, 48,  9, 21, 23, 24, 75, 30, 25, 33, 31],
    'to':   [3, 4, 3, 3,  3, 11, 12, 12, 12, 12, 15, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 9,  0,  25, 25, 25, 25, 25, 33, 33]
  })

var ref = ee.Image('projects/ee-barbarasilvaipam/assets/2024_mapa-referencia/CERRADO_SD-23-Y-C_REFERENCE-MAP')
    .remap({
    'from': [3, 4, 5, 6, 49, 11, 12, 29, 50, 13, 15, 19, 36, 39, 20, 40, 62, 41, 46, 47, 35, 48,  9, 21, 23, 24, 75, 30, 25, 33, 31],
    'to':   [3, 4, 3, 3,  3, 11, 12, 12, 12, 12, 15, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 9,  15,  25, 25, 25, 25, 25, 33, 33]
  }).where(col10.eq(25), 25).rename('REFERENCE') // get urban from col 10


var land = ee.Image('users/dh-conciani/gt_mapa_referencia/embeddings/SD-23-Y-C_classification_LANDSAT_v1').rename('LANDSAT')
var aef = ee.Image('users/dh-conciani/gt_mapa_referencia/embeddings/SD-23-Y-C_classification_AEF_v1').rename('AEF')
var mapbiomas = ee.Image('users/dh-conciani/gt_mapa_referencia/embeddings/SD-23-Y-C_classification_MAPBIPOMAS_v1').rename('MAPBIOMAS')
var mixed = ee.Image('users/dh-conciani/gt_mapa_referencia/embeddings/SD-23-Y-C_classification_MIXED_v1').rename('MIXED')
var mixedfull = ee.Image('users/dh-conciani/gt_mapa_referencia/embeddings/SD-23-Y-C_classification_MIXEDFULL_v1').rename('MIXEDFULL')

var col10_raw = ee.Image('projects/mapbiomas-workspace/COLECAO_DEV/COLECAO10_DEV/CERRADO/LANDSAT/C10-POST-CLASSIFICATION/CERRADO_C10_gapfill_v11').select('classification_2020')
  .remap({
   'from': [3, 4, 5, 6, 49, 11, 12, 29, 50, 13, 15, 18, 19, 39, 20, 40, 62, 41, 46, 47, 35, 48,  9, 21, 23, 24, 75, 30, 25, 33, 31],
    'to':   [3, 4, 3, 3,  3, 11, 12, 12, 12, 12, 15, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 9,  0,  25, 25, 25, 25, 25, 33, 33]
  })
  .rename('COL10_RAW')


// read palette
var vis = {
    'min': 0,
    'max': 62,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification8')
};

Map.addLayer(ref, vis, 'REFERENCE')
Map.addLayer(land, vis,'LANDSAT')
Map.addLayer(aef, vis, 'AEF')
Map.addLayer(mapbiomas, vis, 'MAPBIOMAS')
Map.addLayer(mixed, vis, 'MIXED')
Map.addLayer(mixedfull, vis, 'MIXEDFULL')
Map.addLayer(col10_raw, vis, 'COL10_RAW')

///////////////// compute confusion matrixes
var region = ref.geometry();

var samplePoints = land
  .addBands(ref)
  .addBands(aef)
  .addBands(mapbiomas)
  .addBands(mixed)
  .addBands(mixedfull)
  .addBands(col10_raw)
  .sample({
    region: region,
    scale: 30,              // adjust to your pixel size
    numPixels: 10000,        // number of random samples
    seed: 42,
    geometries: false
  });
  
//print(samplePoints.first())
///////// get confusion matrix
var acc_land = samplePoints.errorMatrix('LANDSAT', 'REFERENCE');
var acc_aef = samplePoints.errorMatrix('AEF', 'REFERENCE');
var acc_mapbiomas = samplePoints.errorMatrix('MAPBIOMAS', 'REFERENCE');
var acc_mixed = samplePoints.errorMatrix('MIXED', 'REFERENCE');
var acc_mixedfull = samplePoints.errorMatrix('MIXEDFULL', 'REFERENCE');
var acc_col10_raw = samplePoints.errorMatrix('COL10_RAW', 'REFERENCE');


print('LANDSAT', acc_land.accuracy(), acc_land.consumersAccuracy(), acc_land.producersAccuracy())
print('AEF', acc_aef.accuracy(), acc_aef.consumersAccuracy(), acc_aef.producersAccuracy())
print('MAPBIOMAS EMBEDDINGS', acc_mapbiomas.accuracy(), acc_mapbiomas.consumersAccuracy(), acc_mapbiomas.producersAccuracy())
print('MIXED', acc_mixed.accuracy(), acc_mixed.consumersAccuracy(), acc_mixed.producersAccuracy())
print('MIXEDFULL', acc_mixedfull.accuracy(), acc_mixedfull.consumersAccuracy(), acc_mixedfull.producersAccuracy())
print('COL10_RAW', acc_col10_raw.accuracy(), acc_col10_raw.consumersAccuracy(), acc_col10_raw.producersAccuracy())

