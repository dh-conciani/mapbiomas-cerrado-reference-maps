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
var mixed = ee.Image('').rename('MIXED')
var mixedfull = ee.Image('').rename('MIXEDFULL')



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


///////////////// compute confusion matrixes
var region = ref.geometry();

var samplePoints = land
  .addBands(ref)
  .addBands(aef)
  .addBands(mapbiomas)
  .sample({
    region: region,
    scale: 30,              // adjust to your pixel size
    numPixels: 15000,        // number of random samples
    seed: 42,
    geometries: false
  });
  
//print(samplePoints.first())
///////// get confusion matrix
var acc_land = samplePoints.errorMatrix('LANDSAT', 'REFERENCE');
var acc_aef = samplePoints.errorMatrix('AEF', 'REFERENCE');
var acc_mapbiomas = samplePoints.errorMatrix('MAPBIOMAS', 'REFERENCE');


print('LANDSAT', acc_land.accuracy())
print('AEF', acc_aef.accuracy())
print('MAPBIOMAS EMBEDDINGS', acc_mapbiomas.accuracy())

