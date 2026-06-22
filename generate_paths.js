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
  const paths = {};
  for (const feature of geojson.features) {
    // Fit every single region to fill the 250x250 box perfectly
    const localProj = d3.geoMercator().fitSize([250, 250], feature);
    const localPathGen = d3.geoPath().projection(localProj);
    paths[feature.properties.code] = localPathGen(feature);
  }
  
  const fileContent = `// Automatically generated SVG paths for French regions
export const regionPaths: Record<string, string> = ${JSON.stringify(paths, null, 2)};
`;

  fs.writeFileSync('src/lib/data/regionPaths.ts', fileContent);
  console.log('Successfully wrote src/lib/data/regionPaths.ts!');
}

run().catch(console.error);
