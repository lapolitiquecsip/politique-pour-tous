
async function testURL() {
    const urls = [
        "https://raw.githubusercontent.com/etalab/france-geojson/master/circonscriptions-legislatives.json",
        "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/circonscriptions-legislatives.geojson"
    ];
    for (const url of urls) {
        try {
            console.log("Testing:", url);
            const resp = await fetch(url);
            if (resp.ok) {
                console.log("OK:", url);
                const data = await resp.json();
                console.log("First feature props:", data.features[0].properties);
                return;
            } else {
                console.log("Failed:", resp.status);
            }
        } catch (e) {
            console.log("Error:", e.message);
        }
    }
}
testURL();
