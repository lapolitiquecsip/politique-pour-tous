const fs = require('fs');
const d3 = require('d3-geo');

async function run() {
  console.log('Fetching France GeoJSON...');
  const res = await fetch('https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/regions.geojson');
  const geojson = await res.json();
  
  // We exclude Outre-mer (codes > 11) for the main map fitting if we want a clean metropolitan focus, 
  // but let's include everything and just fit the projection. 
  // Actually, standard geoMercator fitting might be skewed if we include Guyane and Reunion.
  // Let's filter to only Metropolitan France (codes < '100' or similar, regions 11 to 94).
  const metroFeatures = geojson.features.filter(f => parseInt(f.properties.code) < 95);
  const metroGeojson = { type: 'FeatureCollection', features: metroFeatures };

  console.log('Generating SVG paths...');
  // Fit size to 250x250 pixels
  const projection = d3.geoMercator().fitSize([250, 250], metroGeojson);
  const pathGen = d3.geoPath().projection(projection);
  
  const paths = {};
  for (const feature of geojson.features) {
    // Project each feature individually, but using the metropolitan projection scale
    // Note: Outre-mer will be off-screen or weird, but the user only asked for main regions mostly.
    // If it's an Outre-mer, we can fit it to its own 250x250 box so it displays nicely!
    if (parseInt(feature.properties.code) >= 95 || feature.properties.code === '01' || feature.properties.code === '02' || feature.properties.code === '03' || feature.properties.code === '04' || feature.properties.code === '06') {
       // Outre-mer regions (Guadeloupe, Martinique, Guyane, La Réunion, Mayotte)
       const localProj = d3.geoMercator().fitSize([250, 250], feature);
       const localPathGen = d3.geoPath().projection(localProj);
       paths[feature.properties.code] = localPathGen(feature);
    } else {
       paths[feature.properties.code] = pathGen(feature);
    }
  }
  
  const fileContent = `// Automatically generated SVG paths for French regions
export const regionPaths: Record<string, string> = ${JSON.stringify(paths, null, 2)};
`;

  fs.writeFileSync('src/lib/data/regionPaths.ts', fileContent);
  console.log('Successfully wrote src/lib/data/regionPaths.ts!');
}

run().catch(console.error);
