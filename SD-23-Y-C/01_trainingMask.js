// get training mask to perform the land cover and land use classification 
// dhemerson.costa@ipam.org.br - ipam 

// read study area
var carta = ee.FeatureCollection('projects/nexgenmap/ANCILLARY/nextgenmap_grids')
  .filterMetadata('grid_name', 'equals', 'SD-23-Y-C');

// split into subgrids 
var subcarta = ee.FeatureCollection('projects/nexgenmap/ANCILLARY/nextgenmap_subgrids')
    .filterMetadata('grid', 'equals', 'SD-23-Y-C');

//// read mapbiomas collections
// landsat based
var landsat = ee.Image('projects/mapbiomas-workspace/public/collection8/mapbiomas_collection80_integration_v1')
  .clip(carta);

// set landsat years
var landsat_years = [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020];
  
// remap landsat for reference classes
var landsat_remap = ee.Image([]);
landsat_years.forEach(function(year_i) {
  // get year i
  var landsat_i = landsat.select('classification_' + year_i)
    // remap
    .remap({'from': [3, 4, 5, 6, 49, 11, 12, 32, 29, 50, 13, 15, 19, 39, 20, 40, 62, 41, 36, 46, 47, 35, 48, 9, 21, 23, 24, 30, 25, 33, 31],
            'to':   [3, 4, 3, 3, 3,  11, 12, 12, 12, 12, 12, 15, 19, 19, 19, 19, 19, 19, 36, 36, 36, 36, 36, 9, 21, 25, 24, 30, 25, 33, 33]
    });
    // store
    landsat_remap = landsat_remap.addBands(landsat_i.rename('classification_' + year_i));
});


// sentinel based 
var sentinel = ee.Image('projects/mapbiomas-workspace/public/collection_S2_beta/collection_LULC_S2_beta')
  .clip(carta);

// set sentinel years
var sentinel_years = [2016, 2017, 2018, 2019, 2020];

// remap sentinel for refrence classesmap.
var sentinel_remap = ee.Image([]);
sentinel_years.forEach(function(year_i) {
  // get year i
  var sentinel_i = sentinel.select('classification_' + year_i)
  // remap
    .remap({'from': [3, 4, 5, 6, 49, 11, 12, 32, 29, 50, 13, 15, 19, 39, 20, 40, 62, 41, 36, 46, 47, 35, 48, 9, 21, 23, 24, 30, 25, 33, 31],
            'to':   [3, 4, 3, 3, 3,  11, 12, 12, 12, 12, 12, 15, 19, 19, 19, 19, 19, 19, 36, 36, 36, 36, 36, 9, 21, 25, 24, 30, 25, 33, 33]
    });
  // store
  sentinel_remap = sentinel_remap.addBands(sentinel_i.rename('classification_' + year_i));
});
  
// define function to compute the number of classes per pixel
var calculateNumberOfClasses = function (image) {
    var nClasses = image.reduce(ee.Reducer.countDistinctNonNull());
    return nClasses.rename('number_of_classes');
};

// get the number of changes
var sentinel_nclasses = calculateNumberOfClasses(sentinel_remap);
var landsat_nclasses = calculateNumberOfClasses(landsat_remap);

Map.addLayer(sentinel_remap, {}, 'Sentinel Collection', false);
Map.addLayer(sentinel_nclasses, {palette:['green', 'yellow', 'red'], min:1, max:3}, 'Sentinel n. changes', false);

// get stable pixels
var stable_sentinel = sentinel_remap.select(0).multiply(sentinel_nclasses.eq(1));
var stable_landsat = landsat_remap.select(0).multiply(landsat_nclasses.eq(1));

// read palette
var vis = {
    'min': 0,
    'max': 62,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification8')
};

Map.addLayer(stable_sentinel, vis, 'Stable Sentinel', false);
Map.addLayer(stable_landsat, vis, 'Stable Landsat', false);

// retain only agreement
var stable_mask = ee.Image(0)
  .where(stable_sentinel.eq(stable_landsat), 1)
  .clip(carta)
  .selfMask();
  
// build stable pixels
var stable_pixels = stable_sentinel.updateMask(stable_mask.eq(1)).selfMask();
Map.addLayer(stable_pixels, vis, 'Stable pixels (S2 + C8)');

//// enhance by using distrito federal reference map 
var df_ref = ee.Image('projects/barbaracosta-ipam/assets/base/DF_cobertura-do-solo_2019_img')
  .select('classification_DF_2019')
  .clip(carta);
  
Map.addLayer(df_ref, vis, 'Mapa DF', false);
Map.addLayer(stable_enhanced, vis, 'Melhorado');

// apply distrito federal rules
var stable_enhanced = stable_pixels
  // retain only farming that matches with farming in df map
  .where(stable_pixels.eq(19).or(stable_pixels.eq(36).or(stable_pixels.eq(15))).and(df_ref.neq(21)), 0)
  // retain 'pivo central' as farming
  .where(df_ref.eq(18).and(stable_pixels.eq(19)), stable_pixels)
  // remove native vegetation when df maps says that it is farming
  .where(stable_pixels.eq(3).or(stable_pixels.eq(4).or(stable_pixels.eq(11).or(stable_pixels.eq(12)))).and(df_ref.eq(21)), 0)
  .clip(carta);
  

//// enhance by using goais reference map 







//3-floresta
//9-reflo
//11-várzea
//15-pastagem
//19-agricultura temporáia
//36-agricultura perene
//24-urbano
//25-outras não vegetais
//30-mineração
//33-água
//68-seria um tipo de vegetação intra-urbana ou áreas abertas intra-urbanas


