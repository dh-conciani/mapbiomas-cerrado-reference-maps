// sort stratified spatialPoints to use as training samples
// dhemerson.costa@ipam.org.br

// define string to use as metadata
var version = 1;

// define ibges' carta id
var id_carta = 'SD-23-Y-C';

// input metadata
var version_output = 1;

// output directory
var output_dir = 'users/dh-conciani/gt_mapa_referencia/' + id_carta;

// define sample size
var sampleSize = 7000;     // number of samples to be sorted 
var nSamplesMin = 700;     // minimum sample size by class

// read training mask
var trainingMask = ee.Image('users/dh-conciani/gt_mapa_referencia/SD-23-Y-C/masks/trainingMask_SD-23-Y-C_v1')
  .rename('reference');

// read areas reference 
var referenceAreas = ee.FeatureCollection('users/dh-conciani/gt_mapa_referencia/SD-23-Y-C/SD-23-Y-C_area_v1');

// read study area
var carta = ee.FeatureCollection('projects/nexgenmap/ANCILLARY/nextgenmap_grids')
  .filterMetadata('grid_name', 'equals', id_carta)
  // compute 300m buffer
  .map(function(feature) {
    return feature.buffer({'distance': 300});
  });

// import mapbiomas module
var vis = {
    'min': 0,
    'max': 62,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification8')
};

// plot stable pixels
Map.addLayer(trainingMask, vis, 'trainingMask', false);

// define function to get trainng samples
var getTrainingSamples = function (feature) {
  // for each region 
  var region_i = feature.get('grid_name');
  // read the area for each class
  var forest = ee.Number(feature.get('3'));
  var savanna = ee.Number(feature.get('4'));
  var forestry = ee.Number(feature.get('9'));
  var wetland = ee.Number(feature.get('11'));
  var grassland = ee.Number(feature.get('12'));
  var pasture = ee.Number(feature.get('15'));
  var agriculture = ee.Number(feature.get('19'));
  var mosaic = ee.Number(feature.get('21'));
  var urban = ee.Number(feature.get('24'));
  var non_vegetated = ee.Number(feature.get('25'));
  var mining = ee.Number(feature.get('30'));
  var water = ee.Number(feature.get('33'));
  var agriculture2 = ee.Number(feature.get('36'));
  
  // compute the total area 
  var total = forest.add(savanna).add(forestry).add(wetland).add(grassland).add(pasture).add(agriculture)
                    .add(mosaic).add(urban).add(non_vegetated).add(mining).add(water).add(agriculture2);
              
  // define the equation to compute the n of samples per class
  var computeSize = function (number) {
    return number.divide(total).multiply(sampleSize).round().int16().max(nSamplesMin);
  };
  
  // apply the equation to compute the number of samples
  var n_forest = computeSize(ee.Number(forest));
  var n_savanna = computeSize(ee.Number(savanna));
  var n_forestry = computeSize(ee.Number(forestry));
  var n_wetland = computeSize(ee.Number(wetland));
  var n_grassland = computeSize(ee.Number(grassland));
  var n_pasture = computeSize(ee.Number(pasture));
  var n_agriculture = computeSize(ee.Number(agriculture));
  var n_mosaic = computeSize(ee.Number(mosaic));
  var n_urban = computeSize(ee.Number(urban));  
  var n_non_vegetated = computeSize(ee.Number(non_vegetated));
  var n_mining = computeSize(ee.Number(mining));
  var n_water = computeSize(ee.Number(water));
  var n_agriculture2 = computeSize(ee.Number(agriculture2));

  // get the geometry of the region
  var region_i_geometry = ee.Feature(feature).geometry();
  // clip stablePixels only to the region 
  var referenceMap =  trainingMask.clip(region_i_geometry);
                      
  // generate the sample points
  var training = referenceMap.stratifiedSample(
                                {'scale': 10,
                                 'classBand': 'reference', 
                                 'numPoints': 0,
                                 'region': feature.geometry(),
                                 'seed': 1,
                                 'geometries': true,
                                 'classValues': [3, 4, 9, 11, 12, 15, 19, 21, 24, 25, 30, 33, 36],
                                 'classPoints': [n_forest, n_savanna, n_forestry, n_wetland, n_grassland,
                                                 n_pasture, n_agriculture, n_mosaic, n_urban, n_non_vegetated,
                                                 n_mining, n_water, n_agriculture2]
                                  }
                                );

  // insert the region_id as metadata
  training = training.map(function(doneFeature) {
                return doneFeature.set({'mapb': region_i});
              }
            );
    
  return training;
 };

// apply function and get sample points
var samplePoints = referenceAreas.map(getTrainingSamples).flatten(); 

// apply style over the points
var paletteMapBiomas = require('users/mapbiomas/modules:Palettes.js').get('classification8');
var newSamplesStyled = samplePoints.map(
    function (feature) {
        return feature.set('style', {
            'color': ee.List(paletteMapBiomas)
                .get(feature.get('reference')),
            'width': 1,
        });
    }
).style(
    {
        'styleProperty': 'style'
    }
);

// plot points
Map.addLayer(newSamplesStyled, {}, 'samplePoints');

// export as GEE asset
Export.table.toAsset({'collection': samplePoints,
                      'description': id_carta + '_samplePoints_v' + version,
                      'assetId':  output_dir + '/' + id_carta + '_samplePoints_v' + version});
