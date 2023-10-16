// compute areas to be used as reference to sort the number of per class samples
// dhemerson.costa@ipam.org.br 

// define ibges' carta id
var id_carta = 'SD-23-Y-C';

// input metadata
var version_output = 1;

// define classes to be assessed
var classes = [3, 4, 11, 12, 9, 15, 19, 36, 21, 24, 25, 30, 33];

// output directory
var output_dir = 'users/dh-conciani/gt_mapa_referencia/' + id_carta;

// read study area
var carta = ee.FeatureCollection('projects/nexgenmap/ANCILLARY/nextgenmap_grids')
  .filterMetadata('grid_name', 'equals', id_carta)
  // compute 300m buffer
  .map(function(feature) {
    return feature.buffer({'distance': 300});
  });

// read reference data in which areas will be computed
var mapbiomas = ee.Image('users/dh-conciani/gt_mapa_referencia/SD-23-Y-C/masks/trainingMask_SD-23-Y-C_v1');

// define function to compute area (skm)
var pixelArea = ee.Image.pixelArea().divide(1000000);

// mapbiomas color pallete
var vis = {
    'min': 0,
    'max': 62,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification8')
};

// plot 
Map.addLayer(mapbiomas, vis, 'reference map', true);

// define function to get class area 
// for each region 
var getArea = function(feature) {
  // get classification for the region [i]
  var mapbiomas_i = mapbiomas.clip(feature);
  // for each class [j]
  classes.forEach(function(class_j) {
    // create the reference area
    var reference_ij = pixelArea.mask(mapbiomas_i.eq(class_j));
    // compute area and insert as metadata into the feature 
    feature = feature.set(String(class_j),
                         ee.Number(reference_ij.reduceRegion({
                                      reducer: ee.Reducer.sum(),
                                      geometry: feature.geometry(),
                                      scale: 30,
                                      maxPixels: 1e13 }
                                    ).get('area')
                                  )
                              ); // end of set
                          }); // end of class_j function
  // return feature
  return feature;
}; 

var computed_obj = carta.map(getArea);
print (computed_obj);

// export computation as GEE asset
Export.table.toAsset({'collection': computed_obj, 
                      'description':  id_carta + '_area_v' + version_output,
                      'assetId': output_dir + '/' + id_carta + '_area_v' + version_output});
