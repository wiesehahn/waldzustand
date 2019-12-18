var germany = ee.FeatureCollection("users/wiesehahn/waldsterben/nuts1_germany"),
    wald_nrw = ee.FeatureCollection("users/wiesehahn/waldsterben/nrw/geoportal/basis-dlm_wald_nrw");


/////////////////////////// settings ////////////////////////////////////////////////////////////////

var roi = germany.filterMetadata('NUTS_NAME', 'equals', 'Nordrhein-Westfalen').geometry();


/////////////////////////// functions ////////////////////////////////////////////////////////////////

// Function to mask clouds using the Sentinel-2 QA band
function maskS2clouds(image) {
  var qa = image.select('QA60');
  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
  // scale back to reflectance values (divide by 10000)
  return image.updateMask(mask).divide(10000);
}

// function to add indices
var addIndices = function(image) {
    var ndvi = image.normalizedDifference(['B8', 'B4']).rename("NDVI"); // normalized difference vegetation index
    var ndmi = image.normalizedDifference(['B8', 'B11']).rename("NDMI"); // normalized difference moisture index
    var nbr = image.normalizedDifference(['B8A', 'B12']).rename("NBR"); // normalized burn ratio
  return(image.addBands(ndvi).addBands(ndmi).addBands(nbr).float());
};

// function to create image composite per year
var getComposite = function(year) {
    // Load Sentinel-2 toa because surface reflectance data (level 2A) is not complete atm
    var col = ee.ImageCollection('COPERNICUS/S2')
                  //select time period for change detection (summer)
                  .filterDate(year+'-06-01', year+'-09-01')
                  // Pre-filter to get less cloudy granules.
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE',20))
                  .map(maskS2clouds)
                  .map(addIndices)
                  .median()
                  // mask non forest areas
                  .clip(s);
    return(col);
};


/////////////////////////// create data ////////////////////////////////////////////////////////////////

// apply functions to get images per year
var summer17 = getComposite(2017);
var summer18 = getComposite(2018);
var summer19 = getComposite(2019);



// create image composite from  years 2017 2018 2019
var composition = summer17.select('NBR').rename('NBR17')
.addBands(summer18.select('NBR').rename('NBR18'))
.addBands(summer19.select('NBR').rename('NBR19'))
.clip(roi);



// export data to assets
Export.image.toAsset({
  image: composition, 
  description: 'nbr_171819_nrw',
  assetId: 'waldsterben/nbr_171819_nrw', 
  region: roi, 
  scale: 10, 
  crs: 'EPSG:25832', //ETRS89 / UTM zone 32N
  maxPixels: 1e13
});