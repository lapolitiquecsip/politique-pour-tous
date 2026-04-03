
async function checkGeoJSON() {
    const url = "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/circonscriptions-legislatives.geojson";
    const resp = await fetch(url);
    const data = await resp.json();
    console.log("Total Features:", data.features.length);
    console.log("Sample Properties:", data.features[0].properties);
}
checkGeoJSON();
