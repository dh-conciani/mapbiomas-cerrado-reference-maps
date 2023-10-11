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
var landsat_years = [1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996,
                     1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008,
                     2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020,
                     2021, 2022];
  
// remap landsat for reference classes
landsat_years.forEach(function(year_i) {
  
});




// sentinel based 
var sentinel = ee.Image('projects/mapbiomas-workspace/public/collection_S2_beta/collection_LULC_S2_beta')
  .clip(carta);



//// read reference data





3-floresta
9-reflo
11-várzea
15-pastagem
19-agricultura temporáia
36-agricultura perene
24-urbano
25-outras não vegetais
30-mineração
33-água
68-seria um tipo de vegetação intra-urbana ou áreas abertas intra-urbanas




// read palette
var vis = {
    'min': 0,
    'max': 62,
    'palette': require('users/mapbiomas/modules:Palettes.js').get('classification8')
};

// 
Map.addLayer(carta);
Map.addLayer(sentinel.select('classification_2020'), vis, 'Sentinel');
Map.addLayer(landsat.select('classification_2020'), vis, 'Landsat');

